const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const catalogCache = require("./catalog.cache");
const logAudit = require("../../common/utils/auditLogger");

async function listProducts({ categorySlug } = {}) {
  const where = categorySlug ? { category: { slug: categorySlug } } : {};
  return prisma.product.findMany({
    where,
    include: { category: true, pricingRules: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getProduct(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true, pricingRules: { include: { role: true } } },
  });
  if (!product) throw ApiError.notFound("Product not found");
  return product;
}

async function createProduct(data, actor) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw ApiError.badRequest("Invalid categoryId");

  const product = await prisma.product.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      code: data.code,
      providerCost: data.providerCost,
      metadata: data.metadata || {},
      active: data.active !== undefined ? data.active : true,
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    newValue: product,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return product;
}

async function updateProduct(productId, data, actor) {
  const existing = await prisma.product.findUnique({ where: { id: productId } });
  if (!existing) throw ApiError.notFound("Product not found");

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.providerCost !== undefined && { providerCost: data.providerCost }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
  });

  // The product row itself (including providerCost) is cached — any
  // change here must invalidate it, not just sellingPrice changes.
  await catalogCache.invalidateProduct(productId);

  await logAudit({
    actorId: actor.id,
    action: "PRODUCT_UPDATED",
    entityType: "Product",
    entityId: productId,
    oldValue: existing,
    newValue: updated,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

/**
 * Upserts selling prices for a product across one or more roles in a
 * single call, then invalidates the cache for that product before this
 * function returns — the write-through guarantee: by the time the admin's
 * request completes, no stale price can be served from cache.
 */
async function upsertPricing(productId, pricingByRole, actor) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound("Product not found");

  const oldRules = await prisma.pricingRule.findMany({
    where: { productId },
    include: { role: true },
  });
  const oldByRole = Object.fromEntries(oldRules.map((r) => [r.role.name, r.sellingPrice]));

  const roleNames = Object.keys(pricingByRole);
  const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });
  const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  const results = [];
  for (const roleName of roleNames) {
    const roleId = roleIdByName[roleName];
    if (!roleId) {
      throw ApiError.badRequest(`Unknown role: ${roleName}`);
    }

    const rule = await prisma.pricingRule.upsert({
      where: { productId_roleId: { productId, roleId } },
      update: { sellingPrice: pricingByRole[roleName] },
      create: { productId, roleId, sellingPrice: pricingByRole[roleName] },
    });
    results.push({ role: roleName, sellingPrice: rule.sellingPrice });
  }

  await catalogCache.invalidateProduct(productId);

  await logAudit({
    actorId: actor.id,
    action: "PRICING_UPDATED",
    entityType: "Product",
    entityId: productId,
    oldValue: oldByRole,
    newValue: pricingByRole,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return results;
}

async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  upsertPricing,
  listCategories,
};
