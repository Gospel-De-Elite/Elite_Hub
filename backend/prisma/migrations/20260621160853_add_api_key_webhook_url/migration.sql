/*
  Warnings:

  - You are about to drop the column `created_at` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `api_keys` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "webhook_url" TEXT;
