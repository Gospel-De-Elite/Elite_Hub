/*
  Fixes a regression introduced by 20260621160853_add_api_key_webhook_url,
  which dropped `created_at` and `updated_at` from `api_keys` while adding
  `webhook_url` (almost certainly an unintended side effect of a schema/DB
  drift at the time, not a deliberate design change).

  apiKey.service.js (generateKey, listKeys) has depended on `createdAt` the
  whole time — listKeys() in particular has been throwing
  PrismaClientValidationError on every call since that migration landed,
  since it `select`s and `orderBy`s a field the model no longer has.

  DEFAULT now() is used so any api_keys rows created in the gap between the
  two migrations get a sane (if not historically accurate) value instead of
  failing the NOT NULL constraint.
*/

-- AlterTable
ALTER TABLE "api_keys"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();
