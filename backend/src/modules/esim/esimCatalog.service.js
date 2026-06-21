const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");

// Unlike VTU/SMS products, eSIM packages don't use role-based PricingRule —
// there's no documented reseller/agent discount for eSIMs anywhere in the
// original specs, so this keeps the schema's flat costPrice/sellingPrice
// design as-is rather than forcing it into a pattern it was never meant for.

async function listProducts({ countryCode, activeOnly = true } = {}) {
  return prisma.esimProduct.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(countryCode ? { countryCode } : {}),
    },
    orderBy: [{ country: "asc" }, { sellingPrice: "asc" }],
  });
}

async function getProduct(id) {
  const product = await prisma.esimProduct.findUnique({ where: { id } });
  if (!product) throw ApiError.notFound("eSIM package not found");
  return product;
}

async function createProduct(data, actor) {
  const product = await prisma.esimProduct.create({ data });

  await logAudit({
    actorId: actor.id,
    action: "ESIM_PRODUCT_CREATED",
    entityType: "EsimProduct",
    entityId: product.id,
    newValue: product,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return product;
}

async function updateProduct(id, data, actor) {
  const existing = await prisma.esimProduct.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("eSIM package not found");

  const updated = await prisma.esimProduct.update({ where: { id }, data });

  await logAudit({
    actorId: actor.id,
    action: "ESIM_PRODUCT_UPDATED",
    entityType: "EsimProduct",
    entityId: id,
    oldValue: existing,
    newValue: updated,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

module.exports = { listProducts, getProduct, createProduct, updateProduct };
