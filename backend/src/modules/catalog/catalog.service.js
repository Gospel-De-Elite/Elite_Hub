const prisma = require("../../common/config/prisma");
const catalogCache = require("../pricing/catalog.cache");

/**
 * Customer-facing catalog browsing — closes a gap from Phase 4, where only
 * an admin-facing product listing existed. Returns each product with the
 * single price relevant to the requesting user's role already resolved,
 * not the full role-by-role pricing table admins see.
 */
async function listProductsForRole(roleName, { categorySlug } = {}) {
  const where = { active: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) };
  const products = await prisma.product.findMany({ where, include: { category: true } });

  const results = [];
  for (const product of products) {
    const rule = await catalogCache.getSellingPrice(product.id, roleName);
    results.push({
      id: product.id,
      name: product.name,
      code: product.code,
      category: product.category.slug,
      metadata: product.metadata,
      price: rule ? rule.sellingPrice : null,
    });
  }
  return results;
}

module.exports = { listProductsForRole };
