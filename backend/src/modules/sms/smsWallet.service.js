const { Prisma } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const walletService = require("../wallets/wallet.service");
const catalogCache = require("../pricing/catalog.cache");
const { notificationQueue } = require("../../queues");

async function getWallet(userId) {
  const wallet = await prisma.smsWallet.findUnique({ where: { userId } });
  return wallet || { userId, credits: 0n }; // not yet created — first purchase creates it
}

/**
 * SMS credits are bought with NGN wallet balance, through the same
 * Product/PricingRule catalog as VTU products — no separate provider call
 * happens here. Termii is only involved later, when a campaign actually
 * sends messages, not when credits are purchased.
 */
async function purchaseCredits({ userId, userRole, productId }) {
  const product = await catalogCache.getProduct(productId);
  if (!product || !product.active) throw ApiError.notFound("Product not found or inactive");
  if (product.category.slug !== "sms") {
    throw ApiError.badRequest("This product is not an SMS credit bundle");
  }

  const pricingRule = await catalogCache.getSellingPrice(productId, userRole);
  if (!pricingRule) throw ApiError.badRequest("No pricing configured for this product");

  const sellingPrice = new Prisma.Decimal(pricingRule.sellingPrice);
  const providerCost = new Prisma.Decimal(product.providerCost);
  const credits = BigInt(product.metadata?.credits || 0);
  if (credits <= 0n) throw ApiError.internal("SMS product is missing valid 'credits' metadata");

  const reference = `EH-ORD-${uuidv4()}`;

  let order = await prisma.order.create({
    data: {
      userId,
      orderType: "SMS_CREDIT",
      amount: sellingPrice,
      providerCostSnapshot: providerCost,
      sellingPriceSnapshot: sellingPrice,
      profitSnapshot: sellingPrice.minus(providerCost),
      status: "PENDING",
      reference,
      metadata: { credits: credits.toString() },
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPrice: sellingPrice,
      totalPrice: sellingPrice,
    },
  });

  try {
    await walletService.lockFunds({ userId, amount: sellingPrice, reference: `LOCK-${reference}` });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        metadata: { credits: credits.toString(), failureReason: "INSUFFICIENT_BALANCE" },
      },
    });
    throw error;
  }

  // No external provider involved in the purchase itself, so settle
  // immediately rather than going through provider submission/reconciliation.
  await walletService.settleDebit({
    userId,
    amount: sellingPrice,
    reference: `SETTLE-${reference}`,
    description: `SMS credit purchase: ${product.name}`,
    metadata: { orderId: order.id },
  });

  await prisma.smsWallet.upsert({
    where: { userId },
    update: { credits: { increment: credits } },
    create: { userId, credits },
  });

  order = await prisma.order.update({ where: { id: order.id }, data: { status: "SUCCESS" } });

  await notificationQueue.add("sms-credits-purchased", {
    userId,
    channel: "IN_APP",
    title: "SMS Credits Purchased",
    body: `${credits} SMS credits have been added to your account.`,
  });

  return order;
}

/**
 * Custom SMS credit purchase — user specifies the number of units directly
 * rather than choosing a fixed bundle. Price is calculated dynamically from
 * the SMS-CUSTOM product's per-unit selling price for their role.
 *
 * Validation rules:
 *   - units must be a positive integer
 *   - minimum 10 units per purchase (not worth the overhead of an order for less)
 *   - maximum 100,000 units per single purchase
 *
 * Architecture note: this follows the same lock→settle pattern as the
 * fixed-bundle purchase to preserve the wallet integrity guarantees.
 * There is no external provider call — the SMS credits are granted
 * immediately on settlement, same as the bundle flow.
 */
async function purchaseCustomCredits({ userId, userRole, units }) {
  const parsedUnits = parseInt(units, 10);

  if (!Number.isInteger(parsedUnits) || parsedUnits < 10) {
    throw ApiError.badRequest("Minimum purchase is 10 SMS units.");
  }
  if (parsedUnits > 100_000) {
    throw ApiError.badRequest("Maximum single purchase is 100,000 SMS units.");
  }

  // Fetch the SMS-CUSTOM product from the catalog cache
  const customProduct = await prisma.product.findUnique({
    where:   { code: "SMS-CUSTOM" },
    include: { category: true },
  });
  if (!customProduct || !customProduct.active) {
    throw ApiError.internal("Custom SMS unit pricing is not configured. Contact support.");
  }

  // Get the per-unit selling price for this user's role from the cache
  const pricingRule = await catalogCache.getSellingPrice(customProduct.id, userRole);
  if (!pricingRule) {
    throw ApiError.internal("No per-unit pricing configured for this role.");
  }

  const pricePerUnit  = new Prisma.Decimal(pricingRule.sellingPrice);
  const costPerUnit   = new Prisma.Decimal(customProduct.providerCost);
  const totalCost     = pricePerUnit.times(parsedUnits);
  const totalCost_2dp = totalCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const providerTotal = costPerUnit.times(parsedUnits).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const units_bigint  = BigInt(parsedUnits);
  const reference     = `EH-ORD-${uuidv4()}`;

  // Create the order record — same shape as fixed-bundle order
  let order = await prisma.order.create({
    data: {
      userId,
      orderType:           "SMS_CREDIT",
      amount:              totalCost_2dp,
      providerCostSnapshot: providerTotal,
      sellingPriceSnapshot: totalCost_2dp,
      profitSnapshot:      totalCost_2dp.minus(providerTotal),
      status:              "PENDING",
      reference,
      metadata:            { credits: parsedUnits.toString(), purchaseType: "CUSTOM", pricePerUnit: pricePerUnit.toString() },
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId:    order.id,
      productId:  customProduct.id,
      quantity:   parsedUnits,
      unitPrice:  pricePerUnit,
      totalPrice: totalCost_2dp,
    },
  });

  // Lock funds — same wallet integrity flow as fixed-bundle
  try {
    await walletService.lockFunds({
      userId,
      amount:    totalCost_2dp,
      reference: `LOCK-${reference}`,
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data:  {
        status:   "FAILED",
        metadata: { credits: parsedUnits.toString(), purchaseType: "CUSTOM", failureReason: "INSUFFICIENT_BALANCE" },
      },
    });
    throw error;
  }

  // Immediate settlement — no external provider involved
  await walletService.settleDebit({
    userId,
    amount:      totalCost_2dp,
    reference:   `SETTLE-${reference}`,
    description: `Custom SMS credit purchase: ${parsedUnits} units @ ₦${pricePerUnit}/unit`,
    metadata:    { orderId: order.id },
  });

  await prisma.smsWallet.upsert({
    where:  { userId },
    update: { credits: { increment: units_bigint } },
    create: { userId, credits: units_bigint },
  });

  order = await prisma.order.update({ where: { id: order.id }, data: { status: "SUCCESS" } });

  await notificationQueue.add("sms-credits-purchased", {
    userId,
    channel: "IN_APP",
    title:   "SMS Credits Purchased",
    body:    `${parsedUnits} SMS credits have been added to your account.`,
  });

  return {
    order,
    summary: {
      units:      parsedUnits,
      pricePerUnit: pricePerUnit.toString(),
      totalCost:  totalCost_2dp.toString(),
    },
  };
}

module.exports = { getWallet, purchaseCredits, purchaseCustomCredits };
