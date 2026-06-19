const { Prisma } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const walletService = require("../wallets/wallet.service");
const providerService = require("../providers/provider.service");
const { notificationQueue, reconciliationQueue } = require("../../queues");
const logger = require("../../common/utils/logger");

// Maps each order type to the category its product catalog must belong to —
// guards against e.g. a TV product being submitted through /orders/airtime.
const ORDER_TYPE_CATEGORY_SLUG = {
  AIRTIME: "airtime",
  DATA: "data",
  ELECTRICITY: "electricity",
  TV: "cable-tv",
};

function generateOrderReference() {
  return `EH-ORD-${uuidv4()}`;
}

async function getPricingForRole(productId, roleName) {
  let rule = await prisma.pricingRule.findFirst({
    where: { productId, role: { name: roleName } },
  });

  if (!rule) {
    // No role-specific rule configured — fall back to CUSTOMER pricing
    // rather than blocking the purchase entirely.
    rule = await prisma.pricingRule.findFirst({
      where: { productId, role: { name: "CUSTOMER" } },
    });
  }

  if (!rule) {
    throw ApiError.badRequest("No pricing configured for this product");
  }

  return rule;
}

/**
 * Builds the snapshot fields frozen at order creation. ELECTRICITY is
 * priced as a flat convenience fee on top of a user-entered bill amount,
 * not a fixed catalog price — DISCOs don't have "products" the way data
 * bundles or TV bouquets do, so the fee IS the product, and the bill
 * amount passes through to the provider at zero margin.
 */
function computeAmounts({ orderType, product, pricingRule, billAmount }) {
  if (orderType === "ELECTRICITY") {
    const fee = new Prisma.Decimal(pricingRule.sellingPrice);
    const bill = new Prisma.Decimal(billAmount);
    return {
      amount: bill.plus(fee),
      providerCostSnapshot: bill, // remitted to the DISCO in full
      sellingPriceSnapshot: fee, // our convenience fee
      profitSnapshot: fee, // pure margin — DISCO is paid exactly the bill amount
    };
  }

  const sellingPrice = new Prisma.Decimal(pricingRule.sellingPrice);
  const providerCost = new Prisma.Decimal(product.providerCost);

  return {
    amount: sellingPrice,
    providerCostSnapshot: providerCost,
    sellingPriceSnapshot: sellingPrice,
    profitSnapshot: sellingPrice.minus(providerCost),
  };
}

function buildProviderPayload({ orderType, product, details }) {
  const metadata = product.metadata || {};

  switch (orderType) {
    case "AIRTIME":
      return { network: metadata.network, phone: details.recipientNumber, amount: metadata.denomination };
    case "DATA":
      return { network: metadata.network, phone: details.recipientNumber, planCode: metadata.planCode };
    case "ELECTRICITY":
      return {
        disco: metadata.disco,
        meterNumber: details.meterNumber,
        meterType: details.meterType,
        amount: details.billAmount,
      };
    case "TV":
      return {
        provider: metadata.provider,
        smartcardNumber: details.smartcardNumber,
        bouquetCode: metadata.bouquetCode,
      };
    default:
      throw ApiError.badRequest(`Unsupported order type: ${orderType}`);
  }
}

async function createOrder({ userId, userRole, orderType, productId, details }) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product || !product.active) {
    throw ApiError.notFound("Product not found or inactive");
  }

  if (product.category.slug !== ORDER_TYPE_CATEGORY_SLUG[orderType]) {
    throw ApiError.badRequest(`This product does not belong to the ${orderType} category`);
  }

  const pricingRule = await getPricingForRole(productId, userRole);
  const amounts = computeAmounts({ orderType, product, pricingRule, billAmount: details.billAmount });
  const reference = generateOrderReference();

  // Created BEFORE the wallet lock so even an insufficient-balance failure
  // leaves a visible record in the user's order history, not a silent 400.
  let order = await prisma.order.create({
    data: {
      userId,
      orderType,
      amount: amounts.amount,
      providerCostSnapshot: amounts.providerCostSnapshot,
      sellingPriceSnapshot: amounts.sellingPriceSnapshot,
      profitSnapshot: amounts.profitSnapshot,
      status: "PENDING",
      reference,
      metadata: details,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      quantity: 1,
      unitPrice: amounts.sellingPriceSnapshot,
      totalPrice: amounts.amount,
    },
  });

  try {
    await walletService.lockFunds({
      userId,
      amount: amounts.amount,
      reference: `LOCK-${reference}`,
    });
  } catch (error) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", metadata: { ...details, failureReason: "INSUFFICIENT_BALANCE" } },
    });
    throw error; // surfaces the original 400 ApiError to the caller
  }

  order = await prisma.order.update({ where: { id: order.id }, data: { status: "PROCESSING" } });

  const providerPayload = buildProviderPayload({ orderType, product, details });

  const providerResult = await providerService.submitToProvider({
    orderType,
    payload: providerPayload,
    requestReference: reference,
  });

  return resolveOrderOutcome({ order, userId, amount: amounts.amount, orderType, providerResult });
}

async function resolveOrderOutcome({ order, userId, amount, orderType, providerResult }) {
  if (providerResult.outcome === "SUCCESS") {
    await walletService.settleDebit({
      userId,
      amount,
      reference: `SETTLE-${order.reference}`,
      description: `${orderType} purchase settled`,
      metadata: { orderId: order.id },
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "SUCCESS",
        providerId: providerResult.providerId,
        providerReference: providerResult.providerReference,
        providerResponse: providerResult.raw,
      },
    });

    await notificationQueue.add("order-success", {
      userId,
      channel: "IN_APP",
      title: "Purchase Successful",
      body: `Your ${orderType.toLowerCase()} purchase was successful.`,
    });

    return updated;
  }

  if (providerResult.outcome === "FAILED") {
    // Funds were only ever locked, never debited — release the hold rather
    // than "refund" it. Nothing was ever taken, so nothing needs giving back.
    await walletService.releaseLock({
      userId,
      amount,
      reference: `RELEASE-${order.reference}`,
      reason: `${orderType} purchase failed — ${providerResult.reason || "provider error"}`,
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        providerId: providerResult.providerId,
        providerResponse: providerResult.raw,
      },
    });

    await notificationQueue.add("order-failed", {
      userId,
      channel: "IN_APP",
      title: "Purchase Failed",
      body: `Your ${orderType.toLowerCase()} purchase could not be completed. Your wallet was not charged.`,
    });

    return updated;
  }

  // PROCESSING — ambiguous outcome after a provider timeout. Funds stay
  // locked, order stays in PROCESSING, and a reconciliation job resolves
  // it asynchronously instead of guessing now.
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "PROCESSING", providerId: providerResult.providerId },
  });

  const job = await prisma.orderReconciliationJob.create({
    data: { orderId: order.id, providerId: providerResult.providerId, status: "PENDING" },
  });

  await reconciliationQueue.add(
    "reconcile-order",
    { orderId: order.id, reconciliationJobId: job.id },
    { attempts: 10, backoff: { type: "exponential", delay: 60000 } }
  );

  logger.info(`Order ${order.id} queued for reconciliation (job ${job.id})`);

  return updated;
}

async function getOrder(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { orderItems: true },
  });
  if (!order) throw ApiError.notFound("Order not found");
  return order;
}

async function listOrders(userId, { page = 1, limit = 20, status } = {}) {
  const skip = (page - 1) * limit;
  const where = { userId, ...(status ? { status } : {}) };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.order.count({ where }),
  ]);

  return { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { createOrder, getOrder, listOrders, generateOrderReference };
