-- Google OAuth users don't provide a phone number at registration time.
-- The original schema had phone as NOT NULL which prevents Google sign-up.
-- Making it nullable allows Google users to register and add their phone
-- later from the profile page. The UNIQUE constraint is preserved —
-- NULL values are not considered equal under SQL UNIQUE semantics, so
-- multiple Google users without a phone number will not conflict.

ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
