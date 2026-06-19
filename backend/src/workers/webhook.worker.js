const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const webhookService = require("../modules/wallets/webhook.service");
const logger = require("../common/utils/logger");

const webhookWorker = new Worker(
  "webhook",
  async (job) => {
    if (job.name === "paystack-event") {
      return webhookService.processPaystackEvent(job.data);
    }
    if (job.name === "monnify-event") {
      return webhookService.processMonnifyEvent(job.data);
    }
    logger.warn(`Unknown webhook job name: ${job.name}`);
  },
  { connection }
);

webhookWorker.on("completed", (job) => {
  logger.info(`Webhook job ${job.id} (${job.name}) completed`);
});

webhookWorker.on("failed", (job, err) => {
  logger.error(`Webhook job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

module.exports = webhookWorker;
