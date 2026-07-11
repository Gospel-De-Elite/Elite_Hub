-- Migration: add_email_verification_tokens
-- Adds the email_verification_tokens table used by the email verification flow.
-- The googleId and isEmailVerified columns already exist on users (Phase 1 schema).

CREATE TABLE "email_verification_tokens" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID        NOT NULL,
    "token_hash" TEXT        NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at"    TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_verification_tokens_user_id_idx"
    ON "email_verification_tokens"("user_id");

ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
