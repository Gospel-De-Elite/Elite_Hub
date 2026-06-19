const { Queue } = require("bullmq");
const connection = require("./connection");
const logger = require("../common/utils/logger");

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 86400, count: 1000 }, // keep 1 day / 1000 jobs
  removeOnFail: { age: 604800 }, // keep failed jobs 7 days for inspection
};

// Queues are defined here so any module can enqueue work. Workers that
// actually process these queues are built alongside their owning module:
//   wallet         -> Phase 3 (Wallet & Payment Engine)
//   refund         -> Phase 3/4 (Wallet Engine + Order Engine)
//   webhook        -> Phase 3 (Payment gateway webhooks)
//   reconciliation -> Phase 4 (Provider Integration & Order Engine)
//   sms            -> Phase 6 (SMS Module)
//   notification   -> introduced here, consumed from Phase 3 onward
const opts = { connection, defaultJobOptions };

const walletQueue = new Queue("wallet", opts);
const smsQueue = new Queue("sms", opts);
const refundQueue = new Queue("refund", opts);
const notificationQueue = new Queue("notification", opts);
const webhookQueue = new Queue("webhook", opts);
const reconciliationQueue = new Queue("reconciliation", opts);

logger.info(
  "BullMQ queues initialized: wallet, sms, refund, notification, webhook, reconciliation"
);

module.exports = {
  walletQueue,
  smsQueue,
  refundQueue,
  notificationQueue,
  webhookQueue,
  reconciliationQueue,
};
