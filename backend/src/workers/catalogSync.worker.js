"use strict";

const { Worker } = require("bullmq");
const connection       = require("../queues/connection");
const catalogSyncService = require("../modules/providers/catalogSync.service");
const logger           = require("../common/utils/logger");

/**
 * Catalog Sync Worker
 *
 * Processes jobs enqueued by POST /admin/providers/:id/sync-catalog.
 * Each job carries { syncId } — the ID of a ProviderCatalogSync record
 * already created by the admin endpoint with status RUNNING.
 *
 * The worker calls runCatalogSync(syncId) which does the heavy lifting:
 * fetches provider products, reconciles against our catalog, and updates
 * the sync record with the full summary or error.
 *
 * Retries: 2 attempts with 30s exponential backoff.
 * If both fail, the sync record is left in FAILED state with the error message.
 */
const worker = new Worker(
  "catalog-sync",
  async (job) => {
    const { syncId } = job.data;
    logger.info(`[catalogSync.worker] Processing sync job — syncId: ${syncId}`);
    await catalogSyncService.runCatalogSync(syncId);
    logger.info(`[catalogSync.worker] Sync job complete — syncId: ${syncId}`);
  },
  {
    connection,
    concurrency: 1, // only one sync at a time — provider APIs don't need hammering
    limiter: {
      max:      2,
      duration: 60_000, // max 2 sync jobs per minute globally
    },
  }
);

worker.on("failed", (job, err) => {
  logger.error(`[catalogSync.worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on("error", (err) => {
  logger.error(`[catalogSync.worker] Worker error: ${err.message}`);
});

module.exports = worker;
