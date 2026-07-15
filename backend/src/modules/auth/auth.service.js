"use strict";

const bcrypt  = require("bcryptjs");
const crypto  = require("crypto");
const prisma  = require("../../common/config/prisma");
const ApiError = require("../../common/errors/ApiError");
const env     = require("../../common/config/env");
const generateReferralCode = require("../../common/utils/generateReferralCode");
const logAudit = require("../../common/utils/auditLogger");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../common/utils/jwt");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../../common/utils/mailer");

const REFERRAL_REWARD_AMOUNT   = 100;
const REFRESH_TOKEN_TTL_DAYS   = 30;
const RESET_TOKEN_TTL_MINUTES  = 30;
const VERIFY_TOKEN_TTL_HOURS   = 24;
const RESEND_COOLDOWN_MINUTES  = 1; // minimum gap between resend requests

const DEFAULT_SENDER_ID = "EliteHub";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeUser(user) {
  return {
    id:              user.id,
    firstName:       user.firstName,
    lastName:        user.lastName,
    email:           user.email,
    phone:           user.phone,
    role:            user.role.name,
    referralCode:    user.referralCode,
    status:          user.status,
    isEmailVerified: user.isEmailVerified,
  };
}

async function issueTokenPair(user, meta = {}) {
  const payload = { sub: user.id, role: user.role.name };

  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash: hashToken(refreshToken),
      userAgent: meta.userAgent || null,
      ipAddress: meta.ipAddress || null,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

// ─── Email verification helpers ───────────────────────────────────────────────

async function createAndSendVerificationToken(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  // Invalidate any existing unused tokens before creating a new one.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data:  { usedAt: new Date() }, // mark as used so they won't be accepted
  });

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const verificationUrl =
    `${env.frontendUrl}/auth/verify-email?token=${rawToken}`;

  // Fire-and-forget — mailer never throws, logs internally on failure.
  await sendVerificationEmail({
    to:              user.email,
    firstName:       user.firstName,
    verificationUrl,
  });

  // In dev mode, log the raw token so the flow can be tested without email.
  if (env.nodeEnv !== "production") {
    return { devOnlyVerifyToken: rawToken };
  }

  return null;
}

// ─── Auth functions ───────────────────────────────────────────────────────────

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
    if (!referrer) throw ApiError.badRequest("Invalid referral code");
  }

  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
  if (!customerRole) throw ApiError.internal("CUSTOMER role is not seeded");

  const passwordHash    = await bcrypt.hash(password, 12);
  const newReferralCode = await generateReferralCode(firstName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role:         { connect: { id: customerRole.id } },
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        referralCode: newReferralCode,
        ...(referrer && { referrer: { connect: { id: referrer.id } } }),
      },
      include: { role: true },
    });

    await tx.wallet.create({ data: { userId: created.id } });

    await tx.senderId.create({
      data: { userId: created.id, senderId: DEFAULT_SENDER_ID, isDefault: true, status: "DEFAULT" },
    });

    if (referrer) {
      await tx.referral.create({
        data: {
          referrerId:     referrer.id,
          referredUserId: created.id,
          rewardAmount:   REFERRAL_REWARD_AMOUNT,
          rewarded:       false,
        },
      });
    }

    return created;
  });

  await logAudit({
    actorId:   user.id,
    action:    "USER_REGISTERED",
    entityType: "User",
    entityId:  user.id,
    newValue:  { email: user.email, phone: user.phone },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Send verification email — non-blocking; registration always succeeds.
  const devToken = await createAndSendVerificationToken(user);

  const tokens = await issueTokenPair(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
    ...(devToken || {}),
  };
}

async function login({ email, password }, meta = {}) {
  const user = await prisma.user.findUnique({
    where:   { email },
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

  const tokenHash   = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash, userId: decoded.sub },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  const user = await prisma.user.findUnique({
    where:   { id: decoded.sub },
    include: { role: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("Account no longer active");
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data:  { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user, meta);

  return { user: sanitizeUser(user), ...tokens };
}

async function logout(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data:  { revokedAt: new Date() },
  });
}

async function logoutAll(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date() },
  });

  await logAudit({
    actorId:    userId,
    action:     "LOGOUT_ALL_DEVICES",
    entityType: "User",
    entityId:   userId,
  });
}

async function verifyEmail(token) {
  const tokenHash = hashToken(token);

  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!record) {
    throw ApiError.badRequest("This verification link is invalid or has expired. Request a new one from your dashboard.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data:  { isEmailVerified: true },
    });
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data:  { usedAt: new Date() },
    });
  });

  await logAudit({
    actorId:    record.userId,
    action:     "EMAIL_VERIFIED",
    entityType: "User",
    entityId:   record.userId,
  });

  return { message: "Email address verified successfully." };
}

async function resendVerification(userId) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { role: true },
  });

  if (!user) throw ApiError.notFound("User not found");

  if (user.isEmailVerified) {
    throw ApiError.badRequest("Your email address is already verified.");
  }

  // Rate-gate: prevent hammering — check most recent token created_at
  const recent = await prisma.emailVerificationToken.findFirst({
    where:   { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    const cooldownMs = RESEND_COOLDOWN_MINUTES * 60 * 1000;
    const elapsed    = Date.now() - new Date(recent.createdAt).getTime();
    if (elapsed < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
      throw ApiError.tooManyRequests(
        `Please wait ${waitSec} seconds before requesting another verification email.`
      );
    }
  }

  const devToken = await createAndSendVerificationToken(user);

  return {
    message: "A new verification email has been sent.",
    ...(devToken || {}),
  };
}

async function forgotPassword(email) {
  const genericResponse = { message: "If that email exists, a reset link has been sent." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return genericResponse;

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${env.frontendUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail({
    to:        user.email,
    firstName: user.firstName,
    resetUrl,
  });

  if (env.nodeEnv !== "production") {
    return { ...genericResponse, devOnlyResetToken: rawToken };
  }

  return genericResponse;
}

async function resetPassword({ token, newPassword }) {
  const tokenHash   = hashToken(token);
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
    await tx.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  });

  await logAudit({
    actorId:    resetRecord.userId,
    action:     "PASSWORD_RESET",
    entityType: "User",
    entityId:   resetRecord.userId,
  });

  return { message: "Password has been reset successfully. Please log in again." };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw ApiError.notFound("User not found");
  return sanitizeUser(user);
}

async function updateProfile(userId, { firstName, lastName, phone }) {
  // If phone is being set, check it isn't already taken by another account.
  if (phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== userId) {
      throw ApiError.conflict("This phone number is already linked to another account");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName  && { lastName }),
      // Allow setting phone to null explicitly (user removing it) or a new value.
      // Undefined means "not supplied in this request — leave it alone".
      ...(phone !== undefined && { phone: phone || null }),
    },
    include: { role: true },
  });

  await logAudit({
    actorId:    userId,
    action:     "PROFILE_UPDATED",
    entityType: "User",
    entityId:   userId,
    newValue:   { firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone },
  });

  return sanitizeUser(updated);
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw ApiError.badRequest("Cannot change password for this account");
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.unauthorized("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  });

  await logAudit({
    actorId:    userId,
    action:     "PASSWORD_CHANGED",
    entityType: "User",
    entityId:   userId,
  });

  return { message: "Password changed successfully." };
}

// ─── Google OAuth — find-or-create ───────────────────────────────────────────
/**
 * Called by google.strategy.js after a successful Google OAuth callback.
 * Implements the Addendum's exact rule:
 *   "If Google email matches existing account → link, do not create duplicate"
 *   "Only auto-link if existing account's email is already verified"
 */
async function findOrCreateGoogleUser({ googleId, email, firstName, lastName, picture }) {
  // 1. Look up by Google ID first (returning user, fastest path)
  let user = await prisma.user.findUnique({
    where:   { googleId },
    include: { role: true },
  });
  if (user) return user;

  // 2. Look up by email
  const existingByEmail = await prisma.user.findUnique({
    where:   { email },
    include: { role: true },
  });

  if (existingByEmail) {
    // Addendum rule: only link if the email is already verified on the
    // existing account — prevents an attacker from hijacking an account by
    // simply creating a Google account with the same email address.
    if (!existingByEmail.isEmailVerified) {
      throw ApiError.conflict(
        "An account with this email already exists but is not yet verified. " +
        "Please verify your email address first, then sign in with Google."
      );
    }

    // Link the Google ID to the existing account
    user = await prisma.user.update({
      where:   { id: existingByEmail.id },
      data:    { googleId, isEmailVerified: true },
      include: { role: true },
    });

    await logAudit({
      actorId:    user.id,
      action:     "GOOGLE_ACCOUNT_LINKED",
      entityType: "User",
      entityId:   user.id,
      newValue:   { googleId },
    });

    return user;
  }

  // 3. New user — create from scratch
  const customerRole = await prisma.role.findUnique({ where: { name: "CUSTOMER" } });
  if (!customerRole) throw ApiError.internal("CUSTOMER role is not seeded");

  const referralCode = await generateReferralCode(firstName);

  user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        role:            { connect: { id: customerRole.id } },
        firstName,
        lastName,
        email,
        // Google users have no password — passwordHash stays null.
        // The login endpoint guards against this: `if (!user.passwordHash)`
        // already throws, so Google-only accounts cannot be accessed via
        // the email/password login route.
        passwordHash:    null,
        phone:           null, // will be filled in on first profile visit
        referralCode,
        googleId,
        isEmailVerified: true, // Google already verified the email
      },
      include: { role: true },
    });

    await tx.wallet.create({ data: { userId: created.id } });
    await tx.senderId.create({
      data: { userId: created.id, senderId: DEFAULT_SENDER_ID, isDefault: true, status: "DEFAULT" },
    });

    return created;
  });

  await logAudit({
    actorId:    user.id,
    action:     "USER_REGISTERED_GOOGLE",
    entityType: "User",
    entityId:   user.id,
    newValue:   { email: user.email, googleId },
  });

  return user;
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword,
  findOrCreateGoogleUser,
  sanitizeUser,
  issueTokenPair,
};