"use strict";

const prisma   = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");

// ─── Slug generation ──────────────────────────────────────────────────────────

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")   // remove non-alphanumeric (except spaces and hyphens)
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .slice(0, 200);                  // hard cap so slug fits the VARCHAR(255) column
}

async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug    = baseSlug;
  let attempt = 0;

  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
}

// ─── Sanitize author for public output ───────────────────────────────────────

function sanitizePost(post, { includeContent = true } = {}) {
  return {
    id:           post.id,
    title:        post.title,
    slug:         post.slug,
    excerpt:      post.excerpt,
    coverImageUrl: post.coverImageUrl,
    status:       post.status,
    publishedAt:  post.publishedAt,
    createdAt:    post.createdAt,
    updatedAt:    post.updatedAt,
    author: post.author
      ? { firstName: post.author.firstName, lastName: post.author.lastName }
      : undefined,
    ...(includeContent ? { content: post.content } : {}),
  };
}

// ─── Public reads ─────────────────────────────────────────────────────────────

async function listPublished({ page = 1, limit = 10 } = {}) {
  const skip  = (page - 1) * limit;
  const where = { status: "PUBLISHED" };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take:    limit,
      include: { author: { select: { firstName: true, lastName: true } } },
      // Don't return full content in list view — saves bandwidth
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    posts: posts.map((p) => sanitizePost(p, { includeContent: false })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getPublishedBySlug(slug) {
  const post = await prisma.blogPost.findFirst({
    where:   { slug, status: "PUBLISHED" },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  if (!post) throw ApiError.notFound("Blog post not found");
  return sanitizePost(post);
}

// ─── Admin reads ──────────────────────────────────────────────────────────────

async function listAll({ page = 1, limit = 20, status } = {}) {
  const skip  = (page - 1) * limit;
  const where = status ? { status } : {};

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take:    limit,
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    posts: posts.map((p) => sanitizePost(p, { includeContent: false })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const post = await prisma.blogPost.findUnique({
    where:   { id },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  if (!post) throw ApiError.notFound("Blog post not found");
  return sanitizePost(post);
}

// ─── Admin writes ─────────────────────────────────────────────────────────────

async function create({ title, content, excerpt, coverImageUrl, slug: customSlug }, actorId) {
  if (!title?.trim())   throw ApiError.badRequest("Title is required");
  if (!content?.trim()) throw ApiError.badRequest("Content is required");
  if (!excerpt?.trim()) throw ApiError.badRequest("Excerpt is required");

  const baseSlug = customSlug ? generateSlug(customSlug) : generateSlug(title);
  const slug     = await ensureUniqueSlug(baseSlug);

  const post = await prisma.blogPost.create({
    data: {
      authorId:     actorId,
      title:        title.trim(),
      slug,
      content:      content.trim(),
      excerpt:      excerpt.trim(),
      coverImageUrl: coverImageUrl || null,
      status:       "DRAFT",
    },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({
    actorId,
    action:     "BLOG_POST_CREATED",
    entityType: "BlogPost",
    entityId:   post.id,
    newValue:   { title: post.title, slug: post.slug },
  });

  return sanitizePost(post);
}

async function update(id, { title, content, excerpt, coverImageUrl, slug: customSlug }, actorId) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Blog post not found");

  const data = {};
  if (title        !== undefined) data.title        = title.trim();
  if (content      !== undefined) data.content      = content.trim();
  if (excerpt      !== undefined) data.excerpt      = excerpt.trim();
  if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl || null;

  if (customSlug !== undefined) {
    const baseSlug = generateSlug(customSlug || title || existing.title);
    data.slug = await ensureUniqueSlug(baseSlug, id);
  }

  const post = await prisma.blogPost.update({
    where:   { id },
    data,
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({
    actorId,
    action:     "BLOG_POST_UPDATED",
    entityType: "BlogPost",
    entityId:   id,
    oldValue:   { title: existing.title, status: existing.status },
    newValue:   data,
  });

  return sanitizePost(post);
}

async function publish(id, actorId) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Blog post not found");
  if (existing.status === "PUBLISHED") {
    throw ApiError.badRequest("Post is already published");
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data:  { status: "PUBLISHED", publishedAt: new Date() },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({
    actorId,
    action:     "BLOG_POST_PUBLISHED",
    entityType: "BlogPost",
    entityId:   id,
    newValue:   { publishedAt: post.publishedAt },
  });

  return sanitizePost(post);
}

async function unpublish(id, actorId) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Blog post not found");
  if (existing.status === "DRAFT") {
    throw ApiError.badRequest("Post is already a draft");
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data:  { status: "DRAFT" },
    include: { author: { select: { firstName: true, lastName: true } } },
  });

  await logAudit({
    actorId,
    action:     "BLOG_POST_UNPUBLISHED",
    entityType: "BlogPost",
    entityId:   id,
  });

  return sanitizePost(post);
}

async function remove(id, actorId) {
  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Blog post not found");

  // Published posts cannot be hard-deleted — unpublish first.
  // This prevents accidental loss of published content that may be indexed.
  if (existing.status === "PUBLISHED") {
    throw ApiError.badRequest(
      "Cannot delete a published post. Unpublish it first, then delete."
    );
  }

  await prisma.blogPost.delete({ where: { id } });

  await logAudit({
    actorId,
    action:     "BLOG_POST_DELETED",
    entityType: "BlogPost",
    entityId:   id,
    oldValue:   { title: existing.title, slug: existing.slug },
  });

  return { message: "Post deleted." };
}

// Utility for the frontend editor — generate a preview of what the slug
// would be without creating anything.
function previewSlug(title) {
  return generateSlug(title);
}

module.exports = {
  listPublished,
  getPublishedBySlug,
  listAll,
  getById,
  create,
  update,
  publish,
  unpublish,
  remove,
  previewSlug,
};
