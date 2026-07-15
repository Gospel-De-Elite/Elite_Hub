-- Migration: add_provider_catalog_syncs
-- Tracks catalog sync jobs run against each VTU provider.

CREATE TYPE "catalog_sync_status" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "provider_catalog_syncs" (
    "id"          UUID                  NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID                  NOT NULL,
    "status"      "catalog_sync_status" NOT NULL DEFAULT 'RUNNING',
    "summary"     JSONB,
    "error"       TEXT,
    "started_at"  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "created_at"  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_catalog_syncs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_catalog_syncs_provider_id_idx"
    ON "provider_catalog_syncs"("provider_id");

CREATE INDEX "provider_catalog_syncs_started_at_idx"
    ON "provider_catalog_syncs"("started_at" DESC);

ALTER TABLE "provider_catalog_syncs"
    ADD CONSTRAINT "provider_catalog_syncs_provider_id_fkey"
    FOREIGN KEY ("provider_id")
    REFERENCES "providers"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
