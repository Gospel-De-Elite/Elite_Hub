const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");

async function listProviders() {
  return prisma.provider.findMany({
    include: { providerHealth: true },
    orderBy: [{ providerType: "asc" }, { priority: "asc" }],
  });
}

async function getProvider(id) {
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: { providerHealth: true },
  });
  if (!provider) throw ApiError.notFound("Provider not found");
  return provider;
}

async function updateProvider(id, data, actor) {
  const existing = await prisma.provider.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Provider not found");

  const updated = await prisma.provider.update({
    where: { id },
    data: {
      ...(data.active !== undefined && { active: data.active }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.config !== undefined && { config: data.config }),
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "PROVIDER_UPDATED",
    entityType: "Provider",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

/**
 * Manually resets the circuit breaker — for when an admin knows a provider
 * issue is fixed and doesn't want to wait for the lazy cooldown-expiry
 * auto-retest, or wants to force a provider back into rotation immediately.
 */
async function resetHealth(providerId, actor) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw ApiError.notFound("Provider not found");

  const updated = await prisma.providerHealth.upsert({
    where: { providerId },
    update: {
      isHealthy: true,
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastCheckedAt: new Date(),
    },
    create: { providerId, isHealthy: true, consecutiveFailures: 0 },
  });

  await logAudit({
    actorId: actor.id,
    action: "PROVIDER_HEALTH_RESET",
    entityType: "Provider",
    entityId: providerId,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

module.exports = { listProviders, getProvider, updateProvider, resetHealth };
