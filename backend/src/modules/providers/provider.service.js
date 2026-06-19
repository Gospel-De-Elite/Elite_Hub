const prisma = require("../../common/config/prisma");
const logger = require("../../common/utils/logger");
const smeApiClient = require("./clients/smeApi.client");
const vtuNgClient = require("./clients/vtuNg.client");

const PROVIDER_CLIENTS = {
  "SME API": smeApiClient,
  "VTU.ng": vtuNgClient,
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60 * 1000;

async function getAvailableProvider(providerType, excludeProviderIds = []) {
  const providers = await prisma.provider.findMany({
    where: { providerType, active: true, id: { notIn: excludeProviderIds } },
    orderBy: { priority: "asc" },
    include: { providerHealth: true },
  });

  const now = new Date();

  for (const provider of providers) {
    const health = provider.providerHealth;
    if (!health || health.isHealthy) return provider;
    // Cooldown expired — auto-retest by treating it as available for this attempt.
    if (health.cooldownUntil && health.cooldownUntil < now) return provider;
  }

  return null;
}

async function recordProviderSuccess(providerId) {
  await prisma.providerHealth.upsert({
    where: { providerId },
    update: {
      isHealthy: true,
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastCheckedAt: new Date(),
    },
    create: { providerId, isHealthy: true, consecutiveFailures: 0 },
  });
}

async function recordProviderFailure(providerId) {
  const existing = await prisma.providerHealth.findUnique({ where: { providerId } });
  const consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;
  const isHealthy = consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD;
  const cooldownUntil = isHealthy ? null : new Date(Date.now() + COOLDOWN_MS);

  await prisma.providerHealth.upsert({
    where: { providerId },
    update: {
      consecutiveFailures,
      isHealthy,
      lastFailureAt: new Date(),
      cooldownUntil,
      lastCheckedAt: new Date(),
    },
    create: { providerId, consecutiveFailures, isHealthy, lastFailureAt: new Date(), cooldownUntil },
  });

  if (!isHealthy) {
    logger.error(
      `Provider ${providerId} circuit-broken after ${consecutiveFailures} consecutive failures — cooling down until ${cooldownUntil}`
    );
  }
}

function isTimeoutError(error) {
  return (
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT" ||
    /timeout/i.test(error.message || "")
  );
}

/**
 * Attempts a single provider. Returns { resolved: false } if this provider
 * should be excluded and the next one tried; { resolved: true, outcome }
 * if a final answer was reached (SUCCESS or PROCESSING) and no further
 * provider should be attempted.
 */
async function attemptProvider({ provider, orderType, payload, requestReference }) {
  const client = PROVIDER_CLIENTS[provider.name];
  if (!client) {
    logger.error(`No client configured for provider: ${provider.name}`);
    return { resolved: false };
  }

  try {
    const result = await client.submitOrder({ orderType, payload, requestReference });

    if (result.success) {
      await recordProviderSuccess(provider.id);
      return {
        resolved: true,
        outcome: "SUCCESS",
        providerId: provider.id,
        providerReference: result.providerReference,
        raw: result.raw,
      };
    }

    // Confirmed failure — provider explicitly said no. Not ambiguous, fail over.
    await recordProviderFailure(provider.id);
    return { resolved: false, providerId: provider.id, raw: result.raw };
  } catch (error) {
    if (!isTimeoutError(error)) {
      // Network/server error, also not ambiguous — same treatment as a confirmed failure.
      await recordProviderFailure(provider.id);
      return { resolved: false, providerId: provider.id, raw: { error: error.message } };
    }

    // TIMEOUT — the genuinely ambiguous case. Never fail over on this alone;
    // query status first, per the addendum's core rule.
    try {
      const status = await client.checkStatus(requestReference);

      if (status.status === "SUCCESS") {
        await recordProviderSuccess(provider.id);
        return {
          resolved: true,
          outcome: "SUCCESS",
          providerId: provider.id,
          providerReference: status.providerReference,
          raw: status.raw,
        };
      }

      if (status.status === "FAILED") {
        await recordProviderFailure(provider.id);
        return { resolved: false, providerId: provider.id, raw: status.raw };
      }

      // Still PENDING/UNKNOWN — do not fail over. Queue for async reconciliation.
      return {
        resolved: true,
        outcome: "PROCESSING",
        providerId: provider.id,
        reason: "Provider status unknown after timeout",
      };
    } catch (statusError) {
      logger.error(`Status check failed for ${requestReference}: ${statusError.message}`);
      // Can't even confirm status — safer to reconcile later than risk
      // a premature failover that double-fulfills an already-processed order.
      return {
        resolved: true,
        outcome: "PROCESSING",
        providerId: provider.id,
        reason: "Status check itself failed after timeout",
      };
    }
  }
}

/**
 * Tries providers in priority order. Only fails over on a CONFIRMED failure
 * (explicit rejection, or a non-timeout error). A timeout always triggers a
 * status check first; if that status check is itself inconclusive, the
 * order goes to PROCESSING for async reconciliation instead of failing
 * over — this is the whole reason this function exists instead of a naive
 * try/catch/retry-next-provider loop.
 */
async function submitToProvider({ orderType, payload, requestReference }) {
  const excludeProviderIds = [];

  // Bounded by the number of active VTU providers — never an infinite loop.
  for (let i = 0; i < 5; i++) {
    const provider = await getAvailableProvider("VTU", excludeProviderIds);

    if (!provider) {
      return { outcome: "FAILED", providerId: null, reason: "No healthy provider available" };
    }

    const result = await attemptProvider({ provider, orderType, payload, requestReference });

    if (result.resolved) {
      return result;
    }

    excludeProviderIds.push(provider.id);
    logger.warn(`Provider ${provider.name} failed for ${requestReference}, trying next provider`);
  }

  return { outcome: "FAILED", providerId: null, reason: "All providers exhausted" };
}

module.exports = {
  submitToProvider,
  getAvailableProvider,
  recordProviderSuccess,
  recordProviderFailure,
};
