const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Roles ─────────────────────────────────────────────────────────────────
  const roles = [
    { name: 'CUSTOMER',    description: 'Standard user — purchases services, earns referrals' },
    { name: 'RESELLER',    description: 'Discounted pricing, API access, resell services' },
    { name: 'AGENT',       description: 'Enhanced commission benefits on top of reseller privileges' },
    { name: 'ADMIN',       description: 'Platform management — users, pricing, providers, disputes' },
    { name: 'SUPER_ADMIN', description: 'Full access including financial overrides and system config' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
  }
  console.log('✓ Roles seeded');

  // ── Default SUPER_ADMIN ───────────────────────────────────────────────────
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const existing = await prisma.user.findUnique({ where: { email: 'superadmin@elitehub.ng' } });

  if (!existing) {
    // IMPORTANT: well-known seed credential — change on first login in
    // production. The referral code column is non-nullable so we generate
    // a throwaway value; referrals from this account are never meaningful.
    const passwordHash = await bcrypt.hash('EliteHub@2024!', 12);
    const referralCode = `SA${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const superAdmin = await prisma.user.create({
      data: {
        roleId:          superAdminRole.id,
        firstName:       'Super',
        lastName:        'Admin',
        email:           'superadmin@elitehub.ng',
        phone:           '08000000001',
        passwordHash,
        referralCode,
        isEmailVerified: true,
        status:          'ACTIVE',
      },
    });

    await prisma.wallet.create({ data: { userId: superAdmin.id } });

    await prisma.senderId.create({
      data: { userId: superAdmin.id, senderId: 'EliteHub', isDefault: true, status: 'DEFAULT' },
    });

    console.log('✓ Default super admin created');
    console.log('  Email:    superadmin@elitehub.ng');
    console.log('  Password: EliteHub@2024!  ← CHANGE THIS IMMEDIATELY');
  } else {
    console.log('✓ Super admin already exists, skipping');
  }

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: 'Airtime',     slug: 'airtime' },
    { name: 'Data',        slug: 'data' },
    { name: 'Electricity', slug: 'electricity' },
    { name: 'Cable TV',    slug: 'cable-tv' },
    { name: 'SMS',         slug: 'sms' },
    { name: 'eSIM',        slug: 'esim' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
  }
  console.log('✓ Categories seeded');

  // ── Providers ─────────────────────────────────────────────────────────────
  const providers = [
    { name: 'SME API', providerType: 'VTU',  priority: 1, active: true, config: {} },
    { name: 'VTU.ng',  providerType: 'VTU',  priority: 2, active: true, config: {} },
    { name: 'Termii',  providerType: 'SMS',  priority: 1, active: true, config: {} },
    { name: 'Airalo',  providerType: 'ESIM', priority: 1, active: true, config: {} },
  ];

  for (const p of providers) {
    let found = await prisma.provider.findFirst({ where: { name: p.name } });
    if (!found) {
      found = await prisma.provider.create({ data: p });
      await prisma.providerHealth.create({ data: { providerId: found.id } });
    }
  }
  console.log('✓ Providers seeded');

  // ── Products & Pricing ────────────────────────────────────────────────────
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );
  const roleMap = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.name, r.id])
  );

  const catalog = [
    {
      code: 'MTN-AIRTIME-100', name: 'MTN Airtime ₦100',
      categoryId: catMap['airtime'], providerCost: 98,
      metadata: { network: 'MTN', denomination: 100 },
      pricing: { CUSTOMER: 100, RESELLER: 99, AGENT: 98.5 },
    },
    {
      code: 'MTN-AIRTIME-200', name: 'MTN Airtime ₦200',
      categoryId: catMap['airtime'], providerCost: 196,
      metadata: { network: 'MTN', denomination: 200 },
      pricing: { CUSTOMER: 200, RESELLER: 198, AGENT: 197 },
    },
    {
      code: 'MTN-DATA-1GB-30D', name: 'MTN 1GB - 30 Days',
      categoryId: catMap['data'], providerCost: 280,
      metadata: { network: 'MTN', planCode: 'MTN-1GB-30', validity: '30 days' },
      pricing: { CUSTOMER: 300, RESELLER: 290, AGENT: 285 },
    },
    {
      code: 'DSTV-COMPACT', name: 'DStv Compact',
      categoryId: catMap['cable-tv'], providerCost: 18500,
      metadata: { provider: 'DSTV', bouquetCode: 'COMPACT' },
      pricing: { CUSTOMER: 19000, RESELLER: 18700, AGENT: 18600 },
    },
    {
      code: 'IKEDC-PREPAID', name: 'Ikeja Electric Prepaid',
      categoryId: catMap['electricity'], providerCost: 0,
      metadata: { disco: 'IKEDC', meterType: 'PREPAID' },
      pricing: { CUSTOMER: 100, RESELLER: 80, AGENT: 70 },
    },
    {
      code: 'SMS-100', name: '100 SMS Units',
      categoryId: catMap['sms'], providerCost: 320,
      metadata: { credits: 100 },
      pricing: { CUSTOMER: 400, RESELLER: 380, AGENT: 370 },
    },
    {
      code: 'SMS-500', name: '500 SMS Units',
      categoryId: catMap['sms'], providerCost: 1600,
      metadata: { credits: 500 },
      pricing: { CUSTOMER: 2000, RESELLER: 1900, AGENT: 1850 },
    },
    {
      code: 'SMS-1000', name: '1000 SMS Units',
      categoryId: catMap['sms'], providerCost: 3200,
      metadata: { credits: 1000 },
      pricing: { CUSTOMER: 3800, RESELLER: 3600, AGENT: 3500 },
    },
  ];

  for (const item of catalog) {
    const product = await prisma.product.upsert({
      where:  { code: item.code },
      update: { name: item.name, providerCost: item.providerCost, metadata: item.metadata, active: true },
      create: {
        code: item.code, name: item.name,
        categoryId: item.categoryId,
        providerCost: item.providerCost,
        metadata: item.metadata,
        active: true,
      },
    });

    for (const [roleName, price] of Object.entries(item.pricing)) {
      await prisma.pricingRule.upsert({
        where:  { productId_roleId: { productId: product.id, roleId: roleMap[roleName] } },
        update: { sellingPrice: price },
        create: { productId: product.id, roleId: roleMap[roleName], sellingPrice: price },
      });
    }
  }
  console.log('✓ Products and pricing seeded');

  console.log('\n✅ Database seeded successfully');
}

main()
  .catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
