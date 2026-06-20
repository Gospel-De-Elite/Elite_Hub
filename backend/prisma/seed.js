// prisma/seed.js
// Seeding: roles + categories + providers + products + pricing rules
// Run with: npx prisma db seed

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ────────────────────────────────────────────────
  console.log("→ Seeding roles...");

  const roles = [
    { name: "CUSTOMER",    description: "Standard user — purchases services, earns referrals" },
    { name: "RESELLER",    description: "Discounted pricing, API access, resell services" },
    { name: "AGENT",       description: "Enhanced commission benefits on top of reseller privileges" },
    { name: "ADMIN",       description: "Platform management — users, pricing, providers, disputes" },
    { name: "SUPER_ADMIN", description: "Full access including financial overrides and system config" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
  }

  console.log("✓ Roles seeded");

  // ─── Categories ───────────────────────────────────────────
  console.log("→ Seeding categories...");

  const categories = [
    { name: "Airtime",     slug: "airtime" },
    { name: "Data",        slug: "data" },
    { name: "Electricity", slug: "electricity" },
    { name: "Cable TV",    slug: "cable-tv" },
    { name: "SMS",         slug: "sms" },
    { name: "eSIM",        slug: "esim" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where:  { slug: category.slug },
      update: { name: category.name },
      create: { name: category.name, slug: category.slug },
    });
  }

  console.log("✓ Categories seeded");

  // ─── Providers ────────────────────────────────────────────
  console.log("→ Seeding providers...");

  const providers = [
    { name: "SME API", providerType: "VTU",  priority: 1, active: true, config: {} },
    { name: "VTU.ng",  providerType: "VTU",  priority: 2, active: true, config: {} },
    { name: "Termii",  providerType: "SMS",  priority: 1, active: true, config: {} },
    { name: "Airalo",  providerType: "ESIM", priority: 1, active: true, config: {} },
  ];

  for (const provider of providers) {
    let existing = await prisma.provider.findFirst({ where: { name: provider.name } });

    if (!existing) {
      existing = await prisma.provider.create({ data: provider });
      await prisma.providerHealth.create({ data: { providerId: existing.id } });
    }
  }

  console.log("✓ Providers seeded");

  // ─── Products & Pricing ─────────────────────────────────────
  console.log("→ Seeding products and pricing rules...");

  const airtimeCategory     = await prisma.category.findUnique({ where: { slug: "airtime" } });
  const dataCategory        = await prisma.category.findUnique({ where: { slug: "data" } });
  const electricityCategory = await prisma.category.findUnique({ where: { slug: "electricity" } });
  const tvCategory          = await prisma.category.findUnique({ where: { slug: "cable-tv" } });
  const smsCategory         = await prisma.category.findUnique({ where: { slug: "sms" } });

  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
  const resellerRole = await prisma.role.findUnique({ where: { name: "RESELLER" } });
  const agentRole    = await prisma.role.findUnique({ where: { name: "AGENT" } });
  const roleByName   = { CUSTOMER: customerRole, RESELLER: resellerRole, AGENT: agentRole };

  // ELECTRICITY entries price a flat convenience fee, not the bill itself —
  // see the Phase 4 order service notes for why. SMS entries are credit
  // bundles — `metadata.credits` is how many units get added to the
  // sms_wallets row on purchase.
  const catalog = [
    {
      categoryId: airtimeCategory.id,
      name: "MTN Airtime ₦100",
      code: "MTN-AIRTIME-100",
      providerCost: 98,
      metadata: { network: "MTN", denomination: 100 },
      pricing: { CUSTOMER: 100, RESELLER: 99, AGENT: 98.5 },
    },
    {
      categoryId: airtimeCategory.id,
      name: "MTN Airtime ₦200",
      code: "MTN-AIRTIME-200",
      providerCost: 196,
      metadata: { network: "MTN", denomination: 200 },
      pricing: { CUSTOMER: 200, RESELLER: 198, AGENT: 197 },
    },
    {
      categoryId: dataCategory.id,
      name: "MTN 1GB - 30 Days",
      code: "MTN-DATA-1GB-30D",
      providerCost: 280,
      metadata: { network: "MTN", planCode: "MTN-1GB-30", validity: "30 days" },
      pricing: { CUSTOMER: 300, RESELLER: 290, AGENT: 285 },
    },
    {
      categoryId: tvCategory.id,
      name: "DStv Compact",
      code: "DSTV-COMPACT",
      providerCost: 18500,
      metadata: { provider: "DSTV", bouquetCode: "COMPACT" },
      pricing: { CUSTOMER: 19000, RESELLER: 18700, AGENT: 18600 },
    },
    {
      categoryId: electricityCategory.id,
      name: "Ikeja Electric Prepaid",
      code: "IKEDC-PREPAID",
      providerCost: 0,
      metadata: { disco: "IKEDC", meterType: "PREPAID" },
      pricing: { CUSTOMER: 100, RESELLER: 80, AGENT: 70 }, // flat convenience fee
    },
    {
      categoryId: smsCategory.id,
      name: "100 SMS Units",
      code: "SMS-100",
      providerCost: 320,
      metadata: { credits: 100 },
      pricing: { CUSTOMER: 400, RESELLER: 380, AGENT: 370 },
    },
    {
      categoryId: smsCategory.id,
      name: "500 SMS Units",
      code: "SMS-500",
      providerCost: 1600,
      metadata: { credits: 500 },
      pricing: { CUSTOMER: 2000, RESELLER: 1900, AGENT: 1850 },
    },
    {
      categoryId: smsCategory.id,
      name: "1000 SMS Units",
      code: "SMS-1000",
      providerCost: 3200,
      metadata: { credits: 1000 },
      pricing: { CUSTOMER: 3800, RESELLER: 3600, AGENT: 3500 },
    },
  ];

  for (const item of catalog) {
    const product = await prisma.product.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        categoryId: item.categoryId,
        providerCost: item.providerCost,
        metadata: item.metadata,
        active: true,
      },
      create: {
        name: item.name,
        code: item.code,
        categoryId: item.categoryId,
        providerCost: item.providerCost,
        metadata: item.metadata,
        active: true,
      },
    });

    for (const [roleName, price] of Object.entries(item.pricing)) {
      const role = roleByName[roleName];
      await prisma.pricingRule.upsert({
        where: { productId_roleId: { productId: product.id, roleId: role.id } },
        update: { sellingPrice: price },
        create: { productId: product.id, roleId: role.id, sellingPrice: price },
      });
    }
  }

  console.log("✓ Products and pricing rules seeded");

  console.log("\n✅ Database seeded successfully");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
