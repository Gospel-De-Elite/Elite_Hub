const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const prisma = require("../common/config/prisma");
const walletService = require("../modules/wallets/wallet.service");
const smeApiClient = require("../modules/providers/clients/smeApi.client");
const vtuNgClient = require("../modules/providers/clients/vtuNg.client");
const { notificationQueue } = require("../queues");
const logger = require("../common/utils/logger");

const PROVIDER_CLIENTS = {
  "SME API": smeApiClient,
  "VTU.ng": vtuNgClient,
};

const reconciliationWorker = new Worker(
  "reconciliation",
  async (job) => {
    const { orderId, reconciliationJobId } = job.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { provider: true },
    });

    if (!order) {
      logger.error(`Reconciliation: order ${orderId} not found`);
      return;
    }

    if (order.status !== "PROCESSING") {
      // Already resolved through another path — nothing left to do.
      await prisma.orderReconciliationJob.update({
        where: { id: reconciliationJobId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          notes: `Order already left PROCESSING (now ${order.status})`,
        },
      });
      return;
    }

    await prisma.orderReconciliationJob.update({
      where: { id: reconciliationJobId },
      data: { status: "PROCESSING", attempts: { increment: 1 }, lastAttemptAt: new Date() },
    });

    const client = PROVIDER_CLIENTS[order.provider?.name];
    if (!client) {
      throw new Error(`No client configured for provider ${order.provider?.name} — will retry`);
    }

    const statusResult = await client.checkStatus(order.reference);

    if (statusResult.status === "SUCCESS") {
      await walletService.settleDebit({
        userId: order.userId,
        amount: order.amount,
        reference: `SETTLE-${order.reference}`,
        description: `${order.orderType} purchase settled via reconciliation`,
        metadata: { orderId: order.id },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "SUCCESS",
          providerReference: statusResult.providerReference,
          providerResponse: statusResult.raw,
        },
      });

      await prisma.orderReconciliationJob.update({
        where: { id: reconciliationJobId },
        data: { status: "RESOLVED", resolvedAt: new Date(), notes: "Confirmed SUCCESS on reconciliation" },
      });

      await notificationQueue.add("order-success", {
        userId: order.userId,
        channel: "IN_APP",
        title: "Purchase Successful",
        body: `Your ${order.orderType.toLowerCase()} purchase was successful.`,
      });

      return;
    }

    if (statusResult.status === "FAILED") {
      await walletService.releaseLock({
        userId: order.userId,
        amount: order.amount,
        reference: `RELEASE-${order.reference}`,
        reason: `${order.orderType} purchase confirmed failed on reconciliation`,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED", providerResponse: statusResult.raw },
      });

      await prisma.orderReconciliationJob.update({
        where: { id: reconciliationJobId },
        data: { status: "RESOLVED", resolvedAt: new Date(), notes: "Confirmed FAILED on reconciliation" },
      });

      await notificationQueue.add("order-failed", {
        userId: order.userId,
        channel: "IN_APP",
        title: "Purchase Failed",
        body: `Your ${order.orderType.toLowerCase()} purchase could not be completed. Your wallet was not charged.`,
      });

      return;
    }

    // Still ambiguous — throw so BullMQ retries with the backoff schedule
    // set when this job was enqueued (10 attempts, exponential from 1 min).
    throw new Error(`Order ${order.id} still ${statusResult.status} after reconciliation attempt`);
  },
  { connection }
);

reconciliationWorker.on("completed", (job) => {
  logger.info(`Reconciliation job ${job.id} completed for order ${job.data.orderId}`);
});

reconciliationWorker.on("failed", async (job, err) => {
  logger.error(`Reconciliation job ${job?.id} failed: ${err.message}`);

  const isFinalAttempt = job && job.attemptsMade >= job.opts.attempts;
  if (!isFinalAttempt) return; // BullMQ will retry automatically

  // All retries exhausted and the provider still hasn't given a clear
  // answer. Escalate for manual review rather than leaving the order —
  // and the customer's locked funds — stuck silently forever.
  const { orderId, reconciliationJobId } = job.data;

  await prisma.orderReconciliationJob.update({
    where: { id: reconciliationJobId },
    data: { status: "FAILED", notes: "All reconciliation attempts exhausted — needs manual review" },
  });

  logger.error(
    `Order ${orderId} needs MANUAL REVIEW — reconciliation exhausted all attempts. Funds remain locked.`
  );

  // TODO (Phase 9 — Admin Dashboard): surface orders stuck here in an
  // admin-facing "needs manual review" queue instead of just a log line.
});

module.exports = reconciliationWorker;
