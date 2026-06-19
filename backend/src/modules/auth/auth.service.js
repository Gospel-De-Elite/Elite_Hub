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

// Actual crediting of this reward happens in Phase 5 (Referral Engine) only
// once the referred user's first wallet funding hits >= NGN 2,000.
const REFERRAL_REWARD_AMOUNT = 100;
const REFRESH_TOKEN_TTL_DAYS = 30;

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

    // Pending referral record. `rewarded` flips to true only when the
    // referral engine (Phase 5) confirms qualifying funding.
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

module.exports = { register, login, refresh, logout, logoutAll };
