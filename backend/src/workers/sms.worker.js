const { Worker } = require("bullmq");
const connection = require("../queues/connection");
const prisma = require("../common/config/prisma");
const smsClient = require("../modules/sms/clients/multitexter.client");
const { notificationQueue } = require("../queues");
const logger = require("../common/utils/logger");

const smsWorker = new Worker(
  "sms",
  async (job) => {
    const { campaignId } = job.data;

    const campaign = await prisma.smsCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      logger.error(`SMS worker: campaign ${campaignId} not found`);
      return;
    }

    // The user may have cancelled a SCHEDULED campaign after this delayed
    // job was already queued — BullMQ doesn't know that, so check here.
    if (campaign.status === "CANCELLED") {
      logger.info(`Campaign ${campaignId} was cancelled before send — skipping`);
      return;
    }

    await prisma.smsCampaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });

    const messages = await prisma.smsMessage.findMany({
      where: { campaignId, deliveryStatus: "PENDING" },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const msg of messages) {
      try {
        const result = await smsClient.sendSms({
          to:   msg.recipient,
          from: campaign.senderId,
          sms:  msg.message,
        });

        await prisma.smsMessage.update({
          where: { id: msg.id },
          data: {
            deliveryStatus: result.success ? "SENT" : "FAILED",
            providerResponse: result.raw,
            sentAt: new Date(),
          },
        });

        result.success ? sentCount++ : failedCount++;
      } catch (error) {
        await prisma.smsMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: "FAILED", providerResponse: { error: error.message } },
        });
        failedCount++;
      }
    }

    await prisma.smsCampaign.update({
      where: { id: campaignId },
      data: {
        status: "COMPLETED",
        totalSent: sentCount,
        totalFailed: failedCount,
        completedAt: new Date(),
      },
    });

    await notificationQueue.add("campaign-completed", {
      userId: campaign.userId,
      channel: "IN_APP",
      title: "SMS Campaign Completed",
      body: `Your campaign "${campaign.campaignName}" sent ${sentCount}/${messages.length} messages successfully.`,
    });
  },
  { connection }
);

smsWorker.on("completed", (job) => {
  logger.info(`SMS campaign job ${job.id} completed for campaign ${job.data.campaignId}`);
});

smsWorker.on("failed", (job, err) => {
  logger.error(`SMS campaign job ${job?.id} failed: ${err.message}`);
});

module.exports = smsWorker;
