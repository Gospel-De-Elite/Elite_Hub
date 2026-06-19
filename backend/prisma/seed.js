// prisma/seed.js
// Seeding: roles + categories
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
    {
      name:         "SME API",
      providerType: "VTU",
      priority:     1,
      active:       true,
      config:       {},
    },
    {
      name:         "VTU.ng",
      providerType: "VTU",
      priority:     2,
      active:       true,
      config:       {},
    },
    {
      name:         "Termii",
      providerType: "SMS",
      priority:     1,
      active:       true,
      config:       {},
    },
    {
      name:         "Airalo",
      providerType: "ESIM",
      priority:     1,
      active:       true,
      config:       {},
    },
  ];

  for (const provider of providers) {
    const existing = await prisma.provider.findFirst({
      where: { name: provider.name },
    });

    if (!existing) {
      await prisma.provider.create({ data: provider });

      // seed provider_health row alongside each provider
      const created = await prisma.provider.findFirst({
        where: { name: provider.name },
      });

      await prisma.providerHealth.create({
        data: { providerId: created.id },
      });
    }
  }

  console.log("✓ Providers seeded");

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
