const { v4: uuidv4 } = require("uuid");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const walletService = require("../wallets/wallet.service");
const airaloClient = require("./clients/airalo.client");
const qrStorageService = require("./qrStorage.service");
const logAudit = require("../../common/utils/auditLogger");
const { notificationQueue } = require("../../queues");

async function notifyUser(userId, title, body) {
  await notificationQueue.add("esim-update", { userId, channel: "IN_APP", title, body });
}

async function purchaseEsim({ userId, esimProductId }) {
  const product = await prisma.esimProduct.findUnique({ where: { id: esimProductId } });
  if (!product || !product.active) throw ApiError.notFound("eSIM package not found or inactive");

  const reference = `EH-ESIM-${uuidv4()}`;

  let order = await prisma.esimOrder.create({
    data: { userId, esimProductId, status: "PENDING" },
  });

  try {
    await walletService.lockFunds({ userId, amount: product.sellingPrice, reference: `LOCK-${reference}` });
  } catch (error) {
    await prisma.esimOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    throw error;
  }

  order = await prisma.esimOrder.update({ where: { id: order.id }, data: { status: "PROCESSING" } });

  let airaloResult;
  try {
    airaloResult = await airaloClient.placeOrder({
      packageId: product.providerCode,
      quantity: 1,
      reference,
    });
    if (!airaloResult.qrSource) {
      throw new Error("Provider did not return any usable QR/activation data");
    }
  } catch (error) {
    // No QR was ever obtained — release the hold. Nothing was ever
    // debited, so this is FAILED, not REFUNDED (same convention as VTU
    // orders: REFUNDED is reserved for reversing an already-settled debit).
    await walletService.releaseLock({
      userId,
      amount: product.sellingPrice,
      reference: `RELEASE-${reference}`,
      reason: `eSIM purchase failed — ${error.message}`,
    });

    order = await prisma.esimOrder.update({
      where: { id: order.id },
      data: { status: "FAILED", activationDetails: { error: error.message } },
    });

    await notifyUser(
      userId,
      "eSIM Purchase Failed",
      "Your eSIM purchase could not be completed. Your wallet was not charged."
    );

    return order;
  }

  // Provider confirmed fulfillment — settle the debit now, not before.
  await walletService.settleDebit({
    userId,
    amount: product.sellingPrice,
    reference: `SETTLE-${reference}`,
    description: `eSIM purchase: ${product.packageName} (${product.country})`,
    metadata: { esimOrderId: order.id },
  });

  const qrFilename = await qrStorageService.saveQrCode(order.id, airaloResult.qrSource);

  order = await prisma.esimOrder.update({
    where: { id: order.id },
    data: {
      status: "QR_DELIVERED",
      iccid: airaloResult.iccid,
      qrCodeUrl: qrFilename,
      activationDetails: airaloResult.raw,
      providerReference: airaloResult.providerOrderId,
    },
  });

  await notifyUser(
    userId,
    "Your eSIM is Ready",
    `Your ${product.packageName} eSIM for ${product.country} is ready. View your QR code to activate.`
  );

  return order;
}

async function listOrders(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.esimOrder.findMany({
      where: { userId },
      include: { esimProduct: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.esimOrder.count({ where: { userId } }),
  ]);
  return { orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getOrder(userId, esimOrderId) {
  const order = await prisma.esimOrder.findFirst({
    where: { id: esimOrderId, userId },
    include: { esimProduct: true },
  });
  if (!order) throw ApiError.notFound("eSIM order not found");
  return order;
}

async function getQrCodeFile(userId, userRole, esimOrderId) {
  const order = await prisma.esimOrder.findUnique({ where: { id: esimOrderId } });
  if (!order) throw ApiError.notFound("eSIM order not found");

  const isOwner = order.userId === userId;
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  if (!isOwner && !isAdmin) throw ApiError.forbidden("You do not have access to this eSIM");

  if (!order.qrCodeUrl) throw ApiError.notFound("QR code not yet available for this order");

  return qrStorageService.getAbsolutePath(order.qrCodeUrl);
}

async function openDispute({ userId, esimOrderId, reason }) {
  const order = await prisma.esimOrder.findFirst({ where: { id: esimOrderId, userId } });
  if (!order) throw ApiError.notFound("eSIM order not found");

  if (!["QR_DELIVERED", "ACTIVATED"].includes(order.status)) {
    throw ApiError.badRequest("Disputes can only be opened for orders where a QR was delivered");
  }
  if (order.isDisputed) {
    throw ApiError.conflict("This order already has an open dispute");
  }

  const updated = await prisma.esimOrder.update({
    where: { id: esimOrderId },
    data: { isDisputed: true, disputeReason: reason, status: "DISPUTED" },
  });

  await logAudit({
    actorId: userId,
    action: "ESIM_DISPUTE_OPENED",
    entityType: "EsimOrder",
    entityId: esimOrderId,
    newValue: { reason },
  });

  // TODO (Phase 11 — AI Support Widget): auto-create a support_conversation
  // here so this dispute also shows up in the unified support inbox.

  return updated;
}

async function listDisputes() {
  return prisma.esimOrder.findMany({
    where: { status: "DISPUTED" },
    include: {
      esimProduct: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

/**
 * "Delivered but didn't activate" is always a manual decision — never an
 * automatic refund. REFUND here is the one place EsimOrderStatus.REFUNDED
 * actually gets used: a debit DID settle (status reached QR_DELIVERED), so
 * reversing it now is a genuine refund, not a released hold.
 */
async function resolveDispute({ esimOrderId, resolution, adminNotes, reviewer }) {
  const order = await prisma.esimOrder.findUnique({
    where: { id: esimOrderId },
    include: { esimProduct: true },
  });
  if (!order) throw ApiError.notFound("eSIM order not found");
  if (order.status !== "DISPUTED") throw ApiError.conflict("This order does not have an open dispute");

  if (resolution === "REFUND") {
    await walletService.refundWallet({
      userId: order.userId,
      amount: order.esimProduct.sellingPrice,
      reference: `REFUND-ESIM-${order.id}`,
      description: `eSIM dispute refund: ${order.esimProduct.packageName}`,
      metadata: { esimOrderId: order.id, adminNotes },
    });

    const updated = await prisma.esimOrder.update({
      where: { id: esimOrderId },
      data: { status: "REFUNDED", isDisputed: false },
    });

    await notifyUser(
      order.userId,
      "eSIM Refund Processed",
      `Your dispute for "${order.esimProduct.packageName}" was upheld and ₦${order.esimProduct.sellingPrice} has been refunded to your wallet.`
    );

    await logAudit({
      actorId: reviewer.id,
      action: "ESIM_DISPUTE_REFUNDED",
      entityType: "EsimOrder",
      entityId: esimOrderId,
      newValue: { adminNotes },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    return updated;
  }

  if (resolution === "REJECT") {
    const updated = await prisma.esimOrder.update({
      where: { id: esimOrderId },
      data: { status: "QR_DELIVERED", isDisputed: false },
    });

    await notifyUser(
      order.userId,
      "eSIM Dispute Resolved",
      `Your dispute for "${order.esimProduct.packageName}" was reviewed and could not be upheld.${
        adminNotes ? ` Notes: ${adminNotes}` : ""
      }`
    );

    await logAudit({
      actorId: reviewer.id,
      action: "ESIM_DISPUTE_REJECTED",
      entityType: "EsimOrder",
      entityId: esimOrderId,
      newValue: { adminNotes },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    return updated;
  }

  throw ApiError.badRequest("resolution must be REFUND or REJECT");
}

module.exports = {
  purchaseEsim,
  listOrders,
  getOrder,
  getQrCodeFile,
  openDispute,
  listDisputes,
  resolveDispute,
};
