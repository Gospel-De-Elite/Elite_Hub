const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");

function generateApiKeyPair() {
  const apiKey = `eh_${crypto.randomBytes(12).toString("hex")}`;
  const apiSecret = crypto.randomBytes(24).toString("hex");
  return { apiKey, apiSecret };
}

/**
 * apiSecret is returned ONLY here, this one time — only its bcrypt hash
 * is ever stored. There is no "view secret again" endpoint by design.
 */
async function generateKey({ userId, label }) {
  const { apiKey, apiSecret } = generateApiKeyPair();
  const apiSecretHash = await bcrypt.hash(apiSecret, 10);

  const record = await prisma.apiKey.create({
    data: { userId, apiKey, apiSecretHash, label, status: "ACTIVE" },
  });

  await logAudit({
    actorId: userId,
    action: "API_KEY_GENERATED",
    entityType: "ApiKey",
    entityId: record.id,
    newValue: { label },
  });

  return { id: record.id, apiKey, apiSecret, label: record.label, createdAt: record.createdAt };
}

async function listKeys(userId) {
  return prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      apiKey: true,
      label: true,
      status: true,
      webhookUrl: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function revokeKey(userId, keyId) {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) throw ApiError.notFound("API key not found");
  if (key.status === "REVOKED") throw ApiError.conflict("This key is already revoked");

  const updated = await prisma.apiKey.update({ where: { id: keyId }, data: { status: "REVOKED" } });

  await logAudit({
    actorId: userId,
    action: "API_KEY_REVOKED",
    entityType: "ApiKey",
    entityId: keyId,
  });

  return updated;
}

async function setWebhookUrl(userId, keyId, webhookUrl) {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) throw ApiError.notFound("API key not found");

  return prisma.apiKey.update({ where: { id: keyId }, data: { webhookUrl } });
}

async function getUsageAnalytics(userId, keyId, { days = 7 } = {}) {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) throw ApiError.notFound("API key not found");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const baseWhere = { apiKeyId: keyId, createdAt: { gte: since } };

  const [totalRequests, errorCount, byEndpointRaw, avgResult] = await Promise.all([
    prisma.apiUsageLog.count({ where: baseWhere }),
    prisma.apiUsageLog.count({ where: { ...baseWhere, statusCode: { gte: 400 } } }),
    prisma.apiUsageLog.groupBy({ by: ["endpoint"], where: baseWhere, _count: { _all: true } }),
    prisma.apiUsageLog.aggregate({ where: baseWhere, _avg: { responseTime: true } }),
  ]);

  const successCount = totalRequests - errorCount;
  const byEndpoint = Object.fromEntries(byEndpointRaw.map((r) => [r.endpoint, r._count._all]));

  return {
    totalRequests,
    successCount,
    errorCount,
    successRate: totalRequests ? Math.round((successCount / totalRequests) * 100) : 100,
    avgResponseTime: Math.round(avgResult._avg.responseTime || 0),
    byEndpoint,
    periodDays: days,
  };
}

module.exports = { generateKey, listKeys, revokeKey, setWebhookUrl, getUsageAnalytics };
