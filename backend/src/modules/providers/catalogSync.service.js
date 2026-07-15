"use strict";

/**
 * Provider Catalog Sync Service
 *
 * Reconciles Elite Hub's internal product catalog against what the VTU
 * provider currently offers. Runs as a background BullMQ job so the admin
 * gets an immediate ack and can poll for the result.
 *
 * What it does per sync:
 *   1. Fetches the provider's live product list (via the provider client)
 *   2. For each provider product, finds the matching Elite Hub product by code
 *   3. Flags mismatches:
 *        PRICE_CHANGE  — provider cost changed vs our providerCost
 *        NEW_PRODUCT   — provider offers something we don't have in catalog
 *        DISCONTINUED  — we have a product the provider no longer offers
 *   4. Writes the reconciled summary to provider_catalog_syncs
 *
 * What it does NOT do automatically:
 *   - It never changes prices or activates/deactivates products without
 *     admin confirmation. The summary is information only. An admin reviews
 *     it and decides what to update via the existing pricing admin UI.
 *
 * This design is deliberate: automatic price updates on a financial platform
 * risk surprising customers mid-session. Human-in-the-loop on all changes.
 */

const prisma   = require("../../common/config/prisma");
const logger   = require("../../common/utils/logger");
const logAudit = require("../../common/utils/auditLogger");
const ApiError = require("../../common/errors/ApiError");
const smeApiClient = require("./clients/smeApi.client");
const vtuNgClient  = require("./clients/vtuNg.client");

// Map provider names to their catalog-fetch clients.
// Each client needs a `fetchCatalog()` method — see client files for details.
const CATALOG_CLIENTS = {
  "SME API": smeApiClient,
  "VTU.ng":  vtuNgClient,
};

// ─── Initiate a sync (called by the admin endpoint) ──────────────────────────

async function initiateCatalogSync(providerId, actorId) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw ApiError.notFound("Provider not found");

  if (!CATALOG_CLIENTS[provider.name]) {
    throw ApiError.badRequest(
      `Catalog sync is not supported for provider "${provider.name}". ` +
      `Only SME API and VTU.ng are supported.`
    );
  }

  // Prevent overlapping syncs for the same provider
  const running = await prisma.providerCatalogSync.findFirst({
    where: { providerId, status: "RUNNING" },
  });
  if (running) {
    throw ApiError.conflict(
      "A catalog sync is already running for this provider. Please wait for it to finish."
    );
  }

  // Create the sync record — status starts at RUNNING
  const sync = await prisma.providerCatalogSync.create({
    data: { providerId, status: "RUNNING" },
  });

  await logAudit({
    actorId,
    action:     "CATALOG_SYNC_INITIATED",
    entityType: "ProviderCatalogSync",
    entityId:   sync.id,
    newValue:   { providerId, providerName: provider.name },
  });

  return sync;
}

// ─── Run the actual sync (called by the worker) ───────────────────────────────

async function runCatalogSync(syncId) {
  const sync = await prisma.providerCatalogSync.findUnique({
    where:   { id: syncId },
    include: { provider: true },
  });

  if (!sync) {
    logger.error(`[catalogSync] Sync record ${syncId} not found`);
    return;
  }

  const provider = sync.provider;
  logger.info(`[catalogSync] Starting sync for ${provider.name} (syncId: ${syncId})`);

  const client = CATALOG_CLIENTS[provider.name];
  if (!client || typeof client.fetchCatalog !== "function") {
    await markFailed(syncId, `Provider "${provider.name}" does not implement fetchCatalog()`);
    return;
  }

  try {
    // 1. Fetch live catalog from provider
    const providerProducts = await client.fetchCatalog();

    // 2. Fetch our internal catalog products that belong to VTU categories
    const ourProducts = await prisma.product.findMany({
      include: { category: true },
      where:   { category: { slug: { in: ["airtime", "data", "electricity", "tv"] } } },
    });

    const ourByCode = new Map(ourProducts.map((p) => [p.code, p]));
    const providerCodes = new Set(providerProducts.map((p) => p.code));

    const priceChanges   = [];
    const newProducts    = [];
    const discontinued   = [];
    const unchanged      = [];

    // 3. For each provider product — compare against our catalog
    for (const pp of providerProducts) {
      const ours = ourByCode.get(pp.code);

      if (!ours) {
        newProducts.push({
          code:         pp.code,
          name:         pp.name,
          providerCost: pp.cost,
          category:     pp.category,
          network:      pp.network || null,
        });
        continue;
      }

      const ourCost       = Number(ours.providerCost);
      const providerCost  = Number(pp.cost);
      const delta         = providerCost - ourCost;
      const deltaPercent  = ourCost > 0
        ? ((delta / ourCost) * 100).toFixed(2)
        : null;

      if (Math.abs(delta) >= 0.01) {
        priceChanges.push({
          code:            pp.code,
          name:            pp.name,
          ourProviderCost: ourCost,
          newProviderCost: providerCost,
          delta:           Number(delta.toFixed(2)),
          deltaPercent:    deltaPercent ? `${deltaPercent}%` : null,
          productId:       ours.id,
        });
      } else {
        unchanged.push({ code: pp.code, name: pp.name });
      }
    }

    // 4. Find products we have that the provider no longer offers
    for (const ours of ourProducts) {
      if (!providerCodes.has(ours.code)) {
        discontinued.push({
          code:      ours.code,
          name:      ours.name,
          productId: ours.id,
          active:    ours.active,
        });
      }
    }

    const summary = {
      providerName:      provider.name,
      syncedAt:          new Date().toISOString(),
      totalFromProvider: providerProducts.length,
      totalInOurCatalog: ourProducts.length,
      unchanged:         unchanged.length,
      priceChanges,
      newProducts,
      discontinued,
    };

    await prisma.providerCatalogSync.update({
      where: { id: syncId },
      data: {
        status:     "COMPLETED",
        summary,
        finishedAt: new Date(),
      },
    });

    logger.info(
      `[catalogSync] ${provider.name} sync complete — ` +
      `${priceChanges.length} price changes, ${newProducts.length} new, ${discontinued.length} discontinued`
    );

    return summary;

  } catch (err) {
    logger.error(`[catalogSync] Sync failed for ${provider.name}: ${err.message}`);
    await markFailed(syncId, err.message);
  }
}

async function markFailed(syncId, errorMessage) {
  await prisma.providerCatalogSync.update({
    where: { id: syncId },
    data: {
      status:     "FAILED",
      error:      errorMessage,
      finishedAt: new Date(),
    },
  });
}

// ─── Query helpers used by the admin API ─────────────────────────────────────

async function getSyncStatus(syncId) {
  const sync = await prisma.providerCatalogSync.findUnique({
    where: { id: syncId },
  });
  if (!sync) throw ApiError.notFound("Sync record not found");
  return sync;
}

async function getProviderServices(providerId) {
  const provider = await prisma.provider.findUnique({
    where:   { id: providerId },
    include: { providerHealth: true },
  });
  if (!provider) throw ApiError.notFound("Provider not found");

  // Fetch all products mapped to this provider via the VTU categories
  // Products are shared across providers (both SME API and VTU.ng can
  // fulfill the same product). We return all active VTU catalog products
  // with their pricing rules, plus the last sync record for this provider.
  const products = await prisma.product.findMany({
    where:   { category: { slug: { in: ["airtime", "data", "electricity", "tv"] } }, active: true },
    include: {
      category:    true,
      pricingRules: {
        include: { role: true },
        orderBy: { role: { name: "asc" } },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const lastSync = await prisma.providerCatalogSync.findFirst({
    where:   { providerId },
    orderBy: { startedAt: "desc" },
  });

  return { provider, products, lastSync };
}

async function listSyncHistory(providerId, limit = 10) {
  return prisma.providerCatalogSync.findMany({
    where:   { providerId },
    orderBy: { startedAt: "desc" },
    take:    limit,
  });
}

module.exports = {
  initiateCatalogSync,
  runCatalogSync,
  getSyncStatus,
  getProviderServices,
  listSyncHistory,
};
