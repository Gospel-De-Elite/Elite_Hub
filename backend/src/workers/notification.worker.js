const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const prisma = require("../common/config/prisma");
const logger = require("../common/utils/logger");

// MVP scope: persists every notification job to the notifications table so
// IN_APP notifications become visible via GET /api/v1/notifications. Real
// EMAIL/SMS/WHATSAPP delivery integrations land later (Phase 10/11) — for
// now every channel is persisted the same way; only IN_APP is actually
// "delivered" by this worker, others sit at PENDING until those
// integrations exist.
const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { userId, channel, title, body } = job.data;

    if (!userId || !title || !body) {
      logger.warn(`Notification job ${job.id} missing required fields, skipping`);
      return;
    }

    await prisma.notification.create({
      data: {
        userId,
        channel: channel || "IN_APP",
        title,
        body,
        status: !channel || channel === "IN_APP" ? "SENT" : "PENDING",
      },
    });
  },
  { connection }
);

notificationWorker.on("completed", (job) => {
  logger.info(`Notification job ${job.id} processed for user ${job.data.userId}`);
});

notificationWorker.on("failed", (job, err) => {
  logger.error(`Notification job ${job?.id} failed: ${err.message}`);
});

module.exports = notificationWorker;
