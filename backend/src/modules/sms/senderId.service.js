const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");
const { notificationQueue } = require("../../queues");
const smsClient = require("./clients/multitexter.client");
const logger = require("../../common/utils/logger");

const SENDER_ID_REGEX = /^[A-Za-z0-9 ]{3,11}$/; // GSM alphanumeric sender ID convention: max 11 chars
const IN_PROGRESS_STATUSES = ["PENDING", "ADMIN_APPROVED", "SUBMITTED_TO_CARRIER"];

async function notifyUser(userId, title, body) {
  await notificationQueue.add("sender-id-update", { userId, channel: "IN_APP", title, body });
}

async function submitRequest({ userId, requestedSenderId }) {
  if (!SENDER_ID_REGEX.test(requestedSenderId)) {
    throw ApiError.badRequest("Sender ID must be 3-11 alphanumeric characters");
  }

  const existingInProgress = await prisma.senderIdRequest.findFirst({
    where: { userId, status: { in: IN_PROGRESS_STATUSES } },
  });
  if (existingInProgress) {
    throw ApiError.conflict("You already have a sender ID request in progress");
  }

  return prisma.senderIdRequest.create({ data: { userId, requestedSenderId } });
}

async function listMyRequests(userId) {
  return prisma.senderIdRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

async function listAllRequests({ status } = {}) {
  return prisma.senderIdRequest.findMany({
    where: status ? { status } : {},
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function review({ requestId, action, rejectionReason, reviewer }) {
  const request = await prisma.senderIdRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("Sender ID request not found");
  if (request.status !== "PENDING") {
    throw ApiError.conflict(`This request is no longer pending (currently ${request.status})`);
  }

  if (action === "REJECT") {
    const updated = await prisma.senderIdRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy: reviewer.id, reviewedAt: new Date(), rejectionReason },
    });

    await notifyUser(
      request.userId,
      "Sender ID Request Declined",
      `Your sender ID request "${request.requestedSenderId}" was not approved.${
        rejectionReason ? ` Reason: ${rejectionReason}` : ""
      }`
    );

    await logAudit({
      actorId: reviewer.id,
      action: "SENDER_ID_REJECTED",
      entityType: "SenderIdRequest",
      entityId: requestId,
      newValue: { rejectionReason },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    return updated;
  }

  if (action !== "APPROVE") {
    throw ApiError.badRequest("action must be APPROVE or REJECT");
  }

  let updated = await prisma.senderIdRequest.update({
    where: { id: requestId },
    data: { status: "ADMIN_APPROVED", reviewedBy: reviewer.id, reviewedAt: new Date() },
  });

  await logAudit({
    actorId: reviewer.id,
    action: "SENDER_ID_ADMIN_APPROVED",
    entityType: "SenderIdRequest",
    entityId: requestId,
    ipAddress: reviewer.ipAddress,
    userAgent: reviewer.userAgent,
  });

  // Best-effort automatic submission to the carrier. If this fails, the
  // request simply stays at ADMIN_APPROVED and an admin can retry via
  // POST /admin/sender-id-requests/:id/submit-to-carrier.
  try {
    updated = await submitToCarrier(requestId);
  } catch (error) {
    logger.error(`Auto carrier submission failed for request ${requestId}: ${error.message}`);
  }

  return updated;
}

async function submitToCarrier(requestId) {
  const request = await prisma.senderIdRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("Sender ID request not found");
  if (request.status !== "ADMIN_APPROVED") {
    throw ApiError.conflict("Request must be ADMIN_APPROVED before carrier submission");
  }

  // MultiTexter does not expose a Sender ID registration API — registration
  // must be done manually via the MultiTexter dashboard. requestSenderId is
  // a no-op stub that returns a local acknowledgement so this workflow can
  // advance to SUBMITTED_TO_CARRIER and await admin confirmation.
  const result = await smsClient.requestSenderId({
    senderId: request.requestedSenderId,
  });

  const updated = await prisma.senderIdRequest.update({
    where: { id: requestId },
    data: { status: "SUBMITTED_TO_CARRIER", submittedToCarrierAt: new Date() },
  });

  logger.info(
    `Sender ID "${request.requestedSenderId}" marked SUBMITTED_TO_CARRIER. ` +
    `Register manually at https://web.multitexter.com/dashboard — ${JSON.stringify(result.raw)}`
  );

  return updated;
}

/**
 * Records the carrier's final decision — admin-entered based on what
 * MultiTexter communicates via their dashboard, not automated polling.
 * MultiTexter has no self-serve sender ID status-check API.
 */
async function recordCarrierDecision({ requestId, status, carrierRejectionReason, reviewer }) {
  const request = await prisma.senderIdRequest.findUnique({ where: { id: requestId } });
  if (!request) throw ApiError.notFound("Sender ID request not found");
  if (request.status !== "SUBMITTED_TO_CARRIER") {
    throw ApiError.conflict("Request must be SUBMITTED_TO_CARRIER before recording a carrier decision");
  }

  if (status === "ACTIVE") {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.senderId.create({
        data: {
          userId: request.userId,
          senderId: request.requestedSenderId,
          isDefault: false,
          status: "ACTIVE",
        },
      });

      return tx.senderIdRequest.update({
        where: { id: requestId },
        data: { status: "ACTIVE", activatedAt: new Date() },
      });
    });

    await notifyUser(
      request.userId,
      "Sender ID Activated",
      `Your custom sender ID "${request.requestedSenderId}" is now active and will be used for your SMS campaigns.`
    );

    await logAudit({
      actorId: reviewer.id,
      action: "SENDER_ID_ACTIVATED",
      entityType: "SenderIdRequest",
      entityId: requestId,
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    return updated;
  }

  if (status === "REJECTED") {
    const updated = await prisma.senderIdRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", carrierRejectionReason },
    });

    await notifyUser(
      request.userId,
      "Sender ID Rejected by Carrier",
      `Your sender ID "${request.requestedSenderId}" was rejected by the network carrier.${
        carrierRejectionReason ? ` Reason: ${carrierRejectionReason}` : ""
      } You'll continue sending under the default sender ID.`
    );

    await logAudit({
      actorId: reviewer.id,
      action: "SENDER_ID_CARRIER_REJECTED",
      entityType: "SenderIdRequest",
      entityId: requestId,
      newValue: { carrierRejectionReason },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    return updated;
  }

  throw ApiError.badRequest("status must be ACTIVE or REJECTED");
}

module.exports = {
  submitRequest,
  listMyRequests,
  listAllRequests,
  review,
  submitToCarrier,
  recordCarrierDecision,
};
