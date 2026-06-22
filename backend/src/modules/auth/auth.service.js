const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const generateReferralCode = require("../../common/utils/generateReferralCode");
const logAudit = require("../../common/utils/auditLogger");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../../common/utils/jwt");

// Actual crediting of this reward happens in the referral engine (Phase 5)
// only once the referred user's first funding is confirmed.
const REFERRAL_REWARD_AMOUNT = 100;
const REFRESH_TOKEN_TTL_DAYS = 30;
const RESET_TOKEN_TTL_MINUTES = 30;

// Shared platform default — every user sends under this until/unless they
// get a custom sender ID approved through the full two-layer workflow.
const DEFAULT_SENDER_ID = "EliteHub";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role.name,
    referralCode: user.referralCode,
    status: user.status,
  };
}

async function issueTokenPair(user, meta = {}) {
  const payload = { sub: user.id, role: user.role.name };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  // Refresh tokens are tracked server-side so logout-everywhere and
  // password-reset can actually revoke them — never trusted as purely stateless.
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

async function register(data, meta = {}) {
  const { firstName, lastName, email, phone, password, referralCode } = data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) {
    throw ApiError.conflict("An account with this email or phone already exists");
  }

  let referrer = null;
  if (referralCode) {
    referrer = await prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) {
      throw ApiError.badRequest("Invalid referral code");
    }
  }

  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
  if (!customerRole) throw ApiError.internal("CUSTOMER role is not seeded");

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = await generateReferralCode(firstName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        roleId: customerRole.id,
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        referralCode: newReferralCode,
        referredBy: referrer ? referrer.id : null,
      },
      include: { role: true },
    });

    // Wallet-first platform — every user gets a wallet immediately, balance 0.
    await tx.wallet.create({ data: { userId: created.id } });

    // Every user gets a temporary default sender ID immediately, per the
    // addendum — custom sender IDs go through the full approval workflow,
    // but nobody is ever blocked from sending in the meantime.
    await tx.senderId.create({
      data: {
        userId: created.id,
        senderId: DEFAULT_SENDER_ID,
        isDefault: true,
        status: "DEFAULT",
      },
    });

    // Pending referral record. `rewarded` flips to true only when the
    // referral engine confirms qualifying funding.
    if (referrer) {
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: created.id,
          rewardAmount: REFERRAL_REWARD_AMOUNT,
          rewarded: false,
        },
      });
    }

    return created;
  });

  await logAudit({
    actorId: user.id,
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: user.id,
    newValue: { email: user.email, phone: user.phone },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const tokens = await issueTokenPair(user, meta);

  return { user: sanitizeUser(user), ...tokens };
}

async function login({ email, password }, meta = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden("Account is suspended or banned");
  }

  const tokens = await issueTokenPair(user, meta);

  return { user: sanitizeUser(user), ...tokens };
}

async function refresh(refreshToken, meta = {}) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash, userId: decoded.sub },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: { role: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("Account no longer active");
  }

  // Rotate on every use: revoke the consumed token, issue a brand new pair.
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user, meta);

  return { user: sanitizeUser(user), ...tokens };
}

async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function logoutAll(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    actorId: userId,
    action: "LOGOUT_ALL_DEVICES",
    entityType: "User",
    entityId: userId,
  });
}

/**
 * Always returns the same generic message regardless of whether the email
 * exists — prevents account enumeration via response content/timing.
 *
 * No email provider exists anywhere in this platform yet — in non-production
 * environments, the raw token is returned directly in the response so this
 * flow can be tested end-to-end. This MUST be wired to real email delivery
 * before launch; devOnlyResetToken must never ship in a production response.
 */
async function forgotPassword(email) {
  const genericResponse = { message: "If that email exists, a reset link has been sent." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return genericResponse;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  if (process.env.NODE_ENV !== "production") {
    return { ...genericResponse, devOnlyResetToken: rawToken };
  }

  return genericResponse;
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!resetRecord) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: resetRecord.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } });

    // Security: a password reset invalidates every existing session, not
    // just the device that requested it — if credentials were compromised,
    // any already-issued refresh token should die here too.
    await tx.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await logAudit({
    actorId: resetRecord.userId,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: resetRecord.userId,
  });

  return { message: "Password has been reset successfully. Please log in again." };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
