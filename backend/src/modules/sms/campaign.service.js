const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const { smsQueue } = require("../../queues");

/**
 * Atomic, race-safe decrement — a single UPDATE with a guarding WHERE
 * clause is all the row-level safety SMS credits need (unlike the NGN
 * wallet, there's no separate locked-balance concept here since credits
 * are deducted immediately at campaign creation, not held-then-captured).
 */
async function deductCredits(userId, amount) {
  const rows = await prisma.$queryRaw`
    UPDATE sms_wallets
    SET credits = credits - ${amount}
    WHERE user_id = ${userId}::uuid AND credits >= ${amount}
    RETURNING credits
  `;
  if (!rows.length) {
    throw ApiError.badRequest("Insufficient SMS credits — purchase more before sending this campaign");
  }
  return rows[0].credits;
}

async function refundCredits(userId, amount) {
  await prisma.smsWallet.update({
    where: { userId },
    data: { credits: { increment: amount } },
  });
}

/**
 * Per the addendum: campaigns never block on a pending custom sender ID
 * approval — they silently send under the default ID instead. This picks
 * the user's ACTIVE custom sender ID if one exists, falling back to their
 * DEFAULT one (assigned at registration) otherwise.
 */
async function resolveSenderId(userId) {
  const active = await prisma.senderId.findFirst({
    where: { userId, status: "ACTIVE", isDefault: false },
  });
  if (active) return { value: active.senderId, isDefault: false };

  const def = await prisma.senderId.findFirst({ where: { userId, isDefault: true } });
  if (!def) throw ApiError.internal("User has no default sender ID — registration may be incomplete");

  return { value: def.senderId, isDefault: true };
}

async function createCampaign({ userId, campaignName, message, recipients, scheduledAt }) {
  // Deducted at creation time, not send time — this prevents several
  // scheduled campaigns from collectively overdrawing a balance that
  // looked sufficient when each one was created individually.
  await deductCredits(userId, recipients.length);

  const senderId = await resolveSenderId(userId);
  const isScheduled = Boolean(scheduledAt && new Date(scheduledAt) > new Date());

  let campaign;
  try {
    campaign = await prisma.smsCampaign.create({
      data: {
        userId,
        campaignName,
        senderId: senderId.value,
        messageBody: message,
        totalRecipients: recipients.length,
        status: isScheduled ? "SCHEDULED" : "QUEUED",
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        usedDefaultSenderId: senderId.isDefault,
      },
    });

    await prisma.smsMessage.createMany({
      data: recipients.map((recipient) => ({
        campaignId: campaign.id,
        recipient,
        message,
        deliveryStatus: "PENDING",
      })),
    });
  } catch (error) {
    // Roll back the credit deduction if campaign/message creation itself failed.
    await refundCredits(userId, recipients.length);
    throw error;
  }

  const jobOptions = isScheduled ? { delay: new Date(scheduledAt).getTime() - Date.now() } : {};
  await smsQueue.add("send-campaign", { campaignId: campaign.id }, jobOptions);

  return campaign;
}

async function cancelCampaign(userId, campaignId) {
  const campaign = await prisma.smsCampaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "SCHEDULED") {
    throw ApiError.conflict("Only scheduled campaigns awaiting send can be cancelled");
  }

  await prisma.smsCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } });
  await refundCredits(userId, campaign.totalRecipients);

  return { cancelled: true, creditsRefunded: campaign.totalRecipients };
}

async function listCampaigns(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [campaigns, total] = await Promise.all([
    prisma.smsCampaign.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.smsCampaign.count({ where: { userId } }),
  ]);
  return { campaigns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getCampaign(userId, campaignId) {
  const campaign = await prisma.smsCampaign.findFirst({
    where: { id: campaignId, userId },
    include: { messages: true },
  });
  if (!campaign) throw ApiError.notFound("Campaign not found");
  return campaign;
}

module.exports = {
  deductCredits,
  refundCredits,
  resolveSenderId,
  createCampaign,
  cancelCampaign,
  listCampaigns,
  getCampaign,
};
