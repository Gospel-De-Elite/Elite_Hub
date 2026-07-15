'use strict';

const { v4: uuidv4 } = require('uuid');
const prisma = require('../../common/config/prisma');
const ApiError = require('../../common/errors/ApiError');
const { smsQueue } = require('../../queues');
const redisClient = require('../../common/config/redis');

const PARSED_CONTACTS_TTL = 60 * 30; // 30 minutes

// ── Credit helpers ────────────────────────────────────────────────────────────

async function deductCredits(userId, amount) {
  const rows = await prisma.$queryRaw`
    UPDATE sms_wallets
    SET credits = credits - ${amount}
    WHERE user_id = ${userId}::uuid AND credits >= ${amount}
    RETURNING credits
  `;
  if (!rows.length) {
    throw ApiError.badRequest(
      'Insufficient SMS credits — purchase more before sending this campaign'
    );
  }
  return rows[0].credits;
}

async function refundCredits(userId, amount) {
  await prisma.smsWallet.update({
    where: { userId },
    data: { credits: { increment: amount } },
  });
}

// ── Sender ID resolution ──────────────────────────────────────────────────────

async function resolveSenderId(userId) {
  const active = await prisma.senderId.findFirst({
    where: { userId, status: 'ACTIVE', isDefault: false },
  });
  if (active) return { value: active.senderId, isDefault: false };

  const def = await prisma.senderId.findFirst({ where: { userId, isDefault: true } });
  if (!def) throw ApiError.internal('User has no default sender ID');

  return { value: def.senderId, isDefault: true };
}

// ── Redis helpers for parsed CSV contacts ─────────────────────────────────────

/**
 * Stores a list of phone numbers in Redis and returns a lookup key.
 * The key is scoped to the user — a parsedKey from user A cannot be used
 * by user B to send a campaign.
 */
async function storeParsedContacts(userId, phones) {
  const key = `sms:parsed:${userId}:${uuidv4()}`;
  await redisClient.set(key, JSON.stringify(phones), 'EX', PARSED_CONTACTS_TTL);
  return key;
}

async function fetchParsedContacts(userId, parsedKey) {
  // Enforce ownership — the key must belong to this user.
  if (!parsedKey.startsWith(`sms:parsed:${userId}:`)) {
    throw ApiError.badRequest('Invalid or expired parsed contacts key');
  }
  const raw = await redisClient.get(parsedKey);
  if (!raw) throw ApiError.badRequest('Parsed contacts have expired — please re-upload the CSV');
  return JSON.parse(raw);
}

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

async function createCampaign({ userId, campaignName, message, recipients, parsedKey, scheduledAt }) {
  // Resolve final recipient list — either supplied directly or via a parsedKey
  // from a prior CSV upload. The two are mutually exclusive.
  let finalRecipients = recipients;

  if (parsedKey) {
    finalRecipients = await fetchParsedContacts(userId, parsedKey);
  }

  if (!finalRecipients || !finalRecipients.length) {
    throw ApiError.badRequest('No recipients provided');
  }

  await deductCredits(userId, finalRecipients.length);

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
        totalRecipients: finalRecipients.length,
        status: isScheduled ? 'SCHEDULED' : 'QUEUED',
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        usedDefaultSenderId: senderId.isDefault,
      },
    });

    await prisma.smsMessage.createMany({
      data: finalRecipients.map((recipient) => ({
        campaignId: campaign.id,
        recipient,
        message,
        deliveryStatus: 'PENDING',
      })),
    });
  } catch (err) {
    await refundCredits(userId, finalRecipients.length);
    throw err;
  }

  // Clean up Redis key after successful campaign creation
  if (parsedKey) {
    redisClient.del(parsedKey).catch(() => {});
  }

  const jobOptions = isScheduled ? { delay: new Date(scheduledAt).getTime() - Date.now() } : {};
  await smsQueue.add('send-campaign', { campaignId: campaign.id }, jobOptions);

  return campaign;
}

async function cancelCampaign(userId, campaignId) {
  const campaign = await prisma.smsCampaign.findFirst({ where: { id: campaignId, userId } });
  if (!campaign) throw ApiError.notFound('Campaign not found');
  if (campaign.status !== 'SCHEDULED') {
    throw ApiError.conflict('Only scheduled campaigns can be cancelled');
  }

  await prisma.smsCampaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED' } });
  await refundCredits(userId, campaign.totalRecipients);

  return { cancelled: true, creditsRefunded: campaign.totalRecipients };
}

async function listCampaigns(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [campaigns, total] = await Promise.all([
    prisma.smsCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.smsCampaign.count({ where: { userId } }),
  ]);
  return { campaigns, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getCampaign(userId, campaignId) {
  const campaign = await prisma.smsCampaign.findFirst({
    where: { id: campaignId, userId },
    include: { messages: true },
  });
  if (!campaign) throw ApiError.notFound('Campaign not found');
  return campaign;
}

module.exports = {
  storeParsedContacts,
  fetchParsedContacts,
  createCampaign,
  cancelCampaign,
  listCampaigns,
  getCampaign,
};
