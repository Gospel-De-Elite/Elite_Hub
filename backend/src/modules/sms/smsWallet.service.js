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

module.exports = { getWallet, purchaseCredits };
