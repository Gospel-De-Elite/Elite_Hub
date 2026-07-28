const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const walletService = require("../wallets/wallet.service");
const logAudit = require("../../common/utils/auditLogger");
const { notificationQueue } = require("../../queues");

function sanitize(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role.name,
    status: user.status,
    referralCode: user.referralCode,
    walletBalance: user.wallet?.balance ?? null,
    createdAt: user.createdAt,
  };
}

async function listUsers({ page = 1, limit = 20, role, status, search } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    ...(role ? { role: { name: role } } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true, wallet: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(sanitize),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getUserDetail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, wallet: true },
  });
  if (!user) throw ApiError.notFound("User not found");

  const [recentOrders, successfulReferralsMade, referralReceived] = await Promise.all([
    prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.referral.count({ where: { referrerId: userId, rewarded: true } }),
    prisma.referral.findUnique({ where: { referredUserId: userId } }),
  ]);

  return {
    ...sanitize(user),
    lockedBalance: user.wallet?.lockedBalance ?? null,
    recentOrders,
    successfulReferralsMade,
    wasReferred: Boolean(referralReceived),
  };
}

async function updateStatus({ userId, status, reason, actor }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");

  if (user.id === actor.id) {
    throw ApiError.badRequest("You cannot change your own account status");
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { status } });

  // Belt-and-suspenders: authenticate/refresh already re-check status on
  // every request, so this takes effect immediately regardless — but
  // explicitly revoking tokens too means nothing lingers even inertly.
  if (status !== "ACTIVE") {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await logAudit({
    actorId: actor.id,
    action: "USER_STATUS_CHANGED",
    entityType: "User",
    entityId: userId,
    oldValue: { status: user.status },
    newValue: { status, reason },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  if (status !== "ACTIVE") {
    await notificationQueue.add("account-status-changed", {
      userId,
      channel: "EMAIL",
      title: "Account Status Update",
      body: `Your account has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ""}`,
    });
  }

  return updated;
}

/**
 * SUPER_ADMIN-only financial override — directly credits or debits a
 * wallet outside the normal lock/settle flow, for corrections or goodwill
 * adjustments. Always fully audited; this is the one place in the entire
 * platform where a wallet balance changes without an order or payment
 * behind it, so the audit trail here carries unusual weight.
 */
async function adjustWallet({ userId, amount, direction, reason, actor }) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw ApiError.notFound("Wallet not found");

  const reference = `OVERRIDE-${Date.now()}-${userId.slice(0, 8)}`;

  let result;
  if (direction === "CREDIT") {
    result = await walletService.creditWallet({
      userId,
      amount,
      type: "BONUS",
      reference,
      description: `Admin financial override (credit): ${reason}`,
      metadata: { overrideBy: actor.id, reason },
    });
  } else if (direction === "DEBIT") {
    result = await walletService.manualDebit({
      userId,
      amount,
      reference,
      description: `Admin financial override (debit): ${reason}`,
      metadata: { overrideBy: actor.id, reason },
    });
  } else {
    throw ApiError.badRequest("direction must be CREDIT or DEBIT");
  }

  await logAudit({
    actorId: actor.id,
    action: "WALLET_FINANCIAL_OVERRIDE",
    entityType: "Wallet",
    entityId: wallet.id,
    newValue: { userId, amount, direction, reason },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  await notificationQueue.add("wallet-adjusted", {
    userId,
    channel: "IN_APP",
    title: "Wallet Adjustment",
    body: `Your wallet was ${direction === "CREDIT" ? "credited" : "debited"} NGN ${amount} by an administrator.`,
  });

  return result;
}

/**
 * Directly assign any role to a user — bypasses the self-service
 * role-upgrade request flow. Business rules:
 *
 *  ADMIN       → may assign CUSTOMER / RESELLER / AGENT only;
 *                cannot touch users who currently hold ADMIN or SUPER_ADMIN.
 *  SUPER_ADMIN → unrestricted except they cannot reassign their own account
 *                (self-lockout prevention).
 *
 * Every change is immutably recorded in the audit log.
 */
async function assignRole({ userId, newRoleName, actor }) {
  // Prevent self-reassignment for everyone
  if (userId === actor.id) {
    throw ApiError.badRequest("You cannot change your own role");
  }

  const [targetUser, newRole] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.role.findUnique({ where: { name: newRoleName } }),
  ]);

  if (!targetUser) throw ApiError.notFound("User not found");
  if (!newRole)    throw ApiError.badRequest(`Role '${newRoleName}' does not exist`);

  const targetRoleName = targetUser.role.name;

  // ADMIN restrictions
  if (actor.role === "ADMIN") {
    const adminProtected = ["ADMIN", "SUPER_ADMIN"];
    if (adminProtected.includes(targetRoleName)) {
      throw ApiError.forbidden(
        "Admins cannot modify users with ADMIN or SUPER_ADMIN roles"
      );
    }
    if (adminProtected.includes(newRoleName)) {
      throw ApiError.forbidden(
        "Admins cannot assign ADMIN or SUPER_ADMIN roles"
      );
    }
  }

  // No-op guard — avoid pointless writes
  if (targetRoleName === newRoleName) {
    throw ApiError.badRequest(`User already holds the ${newRoleName} role`);
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { roleId: newRole.id },
  });

  await logAudit({
    actorId:    actor.id,
    action:     "ROLE_MANUALLY_ASSIGNED",
    entityType: "User",
    entityId:   userId,
    oldValue:   { role: targetRoleName },
    newValue:   { role: newRoleName },
    ipAddress:  actor.ipAddress,
    userAgent:  actor.userAgent,
  });

  await notificationQueue.add("role-changed", {
    userId,
    channel: "IN_APP",
    title:   "Account Role Updated",
    body:    `Your account role has been changed to ${newRoleName.replace("_", " ")}.`,
  });

  return { userId, oldRole: targetRoleName, newRole: newRoleName };
}

module.exports = { listUsers, getUserDetail, updateStatus, adjustWallet, assignRole };
