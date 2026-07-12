-- Migration: add_blog_posts
-- Adds the blog_posts table and blog_post_status enum.

CREATE TYPE "blog_post_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "blog_posts" (
    "id"             UUID              NOT NULL DEFAULT gen_random_uuid(),
    "author_id"      UUID              NOT NULL,
    "title"          VARCHAR(255)      NOT NULL,
    "slug"           VARCHAR(255)      NOT NULL,
    "content"        TEXT              NOT NULL,
    "excerpt"        TEXT              NOT NULL,
    "cover_image_url" TEXT,
    "status"         "blog_post_status" NOT NULL DEFAULT 'DRAFT',
    "published_at"   TIMESTAMPTZ,
    "created_at"     TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ       NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_posts_slug_key"      ON "blog_posts"("slug");
CREATE        INDEX "blog_posts_status_date"   ON "blog_posts"("status", "published_at");

ALTER TABLE "blog_posts"
    ADD CONSTRAINT "blog_posts_author_id_fkey"
    FOREIGN KEY ("author_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
