const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const logAudit = require("../../common/utils/auditLogger");
const { notificationQueue } = require("../../queues");

const ROLE_RANK = { CUSTOMER: 0, RESELLER: 1, AGENT: 2, ADMIN: 3, SUPER_ADMIN: 4 };
// ADMIN/SUPER_ADMIN are never self-requested — internal assignment only.
const SELF_REQUESTABLE_ROLES = ["RESELLER", "AGENT"];

async function submitRequest({ userId, currentRole, requestedRole, reason }) {
  if (!SELF_REQUESTABLE_ROLES.includes(requestedRole)) {
    throw ApiError.badRequest("You can only request an upgrade to RESELLER or AGENT");
  }

  if (ROLE_RANK[requestedRole] <= ROLE_RANK[currentRole]) {
    throw ApiError.badRequest("Requested role is not an upgrade from your current role");
  }

  const existingPending = await prisma.roleUpgradeRequest.findFirst({
    where: { requesterId: userId, status: "PENDING" },
  });
  if (existingPending) {
    throw ApiError.conflict("You already have a pending role upgrade request");
  }

  const role = await prisma.role.findUnique({ where: { name: requestedRole } });
  if (!role) throw ApiError.internal(`Role ${requestedRole} is not seeded`);

  return prisma.roleUpgradeRequest.create({
    data: { requesterId: userId, requestedRoleId: role.id, reason },
  });
}

async function listMyRequests(userId) {
  return prisma.roleUpgradeRequest.findMany({
    where: { requesterId: userId },
    include: { requestedRole: true },
    orderBy: { createdAt: "desc" },
  });
}

async function listPendingRequests() {
  return prisma.roleUpgradeRequest.findMany({
    where: { status: "PENDING" },
    include: {
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
      requestedRole: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function reviewRequest({ requestId, action, rejectionReason, reviewer }) {
  const request = await prisma.roleUpgradeRequest.findUnique({
    where: { id: requestId },
    include: { requestedRole: true, requester: true },
  });
  if (!request) throw ApiError.notFound("Role upgrade request not found");
  if (request.status !== "PENDING") {
    throw ApiError.conflict(`This request has already been ${request.status.toLowerCase()}`);
  }

  if (action === "APPROVE") {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: request.requesterId },
        data: { roleId: request.requestedRoleId },
      });

      return tx.roleUpgradeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedBy: reviewer.id, reviewedAt: new Date() },
      });
    });

    await logAudit({
      actorId: reviewer.id,
      action: "ROLE_UPGRADE_APPROVED",
      entityType: "User",
      entityId: request.requesterId,
      oldValue: { roleId: request.requester.roleId },
      newValue: { roleId: request.requestedRoleId, roleName: request.requestedRole.name },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    await notificationQueue.add("role-upgrade-approved", {
      userId: request.requesterId,
      channel: "IN_APP",
      title: "Role Upgrade Approved",
      body: `Congratulations! Your account has been upgraded to ${request.requestedRole.name}.`,
    });

    return updated;
  }

  if (action === "REJECT") {
    const updated = await prisma.roleUpgradeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedBy: reviewer.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || "Not specified",
      },
    });

    await logAudit({
      actorId: reviewer.id,
      action: "ROLE_UPGRADE_REJECTED",
      entityType: "User",
      entityId: request.requesterId,
      newValue: { rejectionReason },
      ipAddress: reviewer.ipAddress,
      userAgent: reviewer.userAgent,
    });

    await notificationQueue.add("role-upgrade-rejected", {
      userId: request.requesterId,
      channel: "IN_APP",
      title: "Role Upgrade Request Declined",
      body: `Your request to upgrade to ${request.requestedRole.name} was not approved.${
        rejectionReason ? ` Reason: ${rejectionReason}` : ""
      }`,
    });

    return updated;
  }

  throw ApiError.badRequest("action must be APPROVE or REJECT");
}

module.exports = { submitRequest, listMyRequests, listPendingRequests, reviewRequest };
