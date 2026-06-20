const redisClient = require("../../common/config/redis");
const prisma = require("../../common/config/prisma");
const logger = require("../../common/utils/logger");

const PRODUCT_PREFIX = "catalog:product:";
const PRICING_PREFIX = "catalog:pricing:";
const CACHE_TTL_SECONDS = 300; // safety-net TTL only — write-through invalidation is primary

function productKey(productId) {
  return `${PRODUCT_PREFIX}${productId}`;
}

function pricingKey(productId, roleName) {
  return `${PRICING_PREFIX}${productId}:${roleName}`;
}

async function getProduct(productId) {
  const key = productKey(productId);

  const cached = await redisClient.get(key);
  if (cached !== null) return JSON.parse(cached);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (product) {
    await redisClient.set(key, JSON.stringify(product), "EX", CACHE_TTL_SECONDS);
  }

  return product;
}

async function getSellingPrice(productId, roleName) {
  const key = pricingKey(productId, roleName);

  const cached = await redisClient.get(key);
  if (cached !== null) return JSON.parse(cached);

  const rule = await fetchPricingFromDb(productId, roleName);
  if (rule) {
    await redisClient.set(key, JSON.stringify(rule), "EX", CACHE_TTL_SECONDS);
  }

  return rule;
}

async function fetchPricingFromDb(productId, roleName) {
  let rule = await prisma.pricingRule.findFirst({
    where: { productId, role: { name: roleName } },
    select: { id: true, sellingPrice: true, productId: true, roleId: true },
  });

  if (!rule) {
    // No role-specific rule configured — fall back to CUSTOMER pricing
    // rather than blocking the purchase entirely.
    rule = await prisma.pricingRule.findFirst({
      where: { productId, role: { name: "CUSTOMER" } },
      select: { id: true, sellingPrice: true, productId: true, roleId: true },
    });
  }

  return rule;
}

/**
 * Write-through invalidation — call immediately after ANY admin write that
 * touches a product or its pricing, in the same request, before responding
 * success. The short TTL above is a safety net for missed invalidations,
 * never the primary mechanism — by the time an admin's request completes,
 * no stale product or price should be servable from cache.
 */
async function invalidateProduct(productId) {
  const roles = ["CUSTOMER", "RESELLER", "AGENT", "ADMIN", "SUPER_ADMIN"];
  const pricingKeys = roles.map((role) => pricingKey(productId, role));

  await redisClient.del(productKey(productId), ...pricingKeys);
  logger.info(`Catalog cache invalidated for product ${productId}`);
}

module.exports = { getProduct, getSellingPrice, invalidateProduct };
