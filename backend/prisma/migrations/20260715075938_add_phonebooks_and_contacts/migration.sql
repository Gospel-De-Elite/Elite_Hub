-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "phonebooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "phonebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phonebook_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phonebook_id" UUID NOT NULL,
    "name" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phonebook_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "phonebooks_user_id_idx" ON "phonebooks"("user_id");

-- CreateIndex
CREATE INDEX "phonebook_contacts_phonebook_id_idx" ON "phonebook_contacts"("phonebook_id");

-- CreateIndex
CREATE UNIQUE INDEX "phonebook_contacts_phonebook_id_phone_key" ON "phonebook_contacts"("phonebook_id", "phone");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- AddForeignKey
ALTER TABLE "phonebooks" ADD CONSTRAINT "phonebooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phonebook_contacts" ADD CONSTRAINT "phonebook_contacts_phonebook_id_fkey" FOREIGN KEY ("phonebook_id") REFERENCES "phonebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "blog_posts_status_date" RENAME TO "blog_posts_status_published_at_idx";
