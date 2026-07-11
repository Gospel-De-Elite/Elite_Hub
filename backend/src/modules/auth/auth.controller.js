"use strict";

const catchAsync  = require("../../common/utils/catchAsync");
const authService = require("./auth.service");
const env         = require("../../common/config/env");
const passport    = require("./google.strategy");
const logger      = require("../../common/utils/logger");

function getMeta(req) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

// ─── Standard auth ────────────────────────────────────────────────────────────

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body, getMeta(req));
  res.status(201).json({ success: true, data: result });
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body, getMeta(req));
  res.status(200).json({ success: true, data: result });
});

const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, getMeta(req));
  res.status(200).json({ success: true, data: result });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

const logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.status(200).json({ success: true, message: "Logged out from all devices" });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json({ success: true, data: result });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword({
    token:       req.body.token,
    newPassword: req.body.newPassword,
  });
  res.status(200).json({ success: true, data: result });
});

const getCurrentUser = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ success: true, data: user });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await authService.changePassword({
    userId:          req.user.id,
    currentPassword: req.body.currentPassword,
    newPassword:     req.body.newPassword,
  });
  res.status(200).json({ success: true, data: result });
});

// ─── Email verification ────────────────────────────────────────────────────────

const verifyEmail = catchAsync(async (req, res) => {
  const result = await authService.verifyEmail(req.query.token);
  res.status(200).json({ success: true, data: result });
});

const resendVerification = catchAsync(async (req, res) => {
  const result = await authService.resendVerification(req.user.id);
  res.status(200).json({ success: true, data: result });
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Step 1 — redirect the browser to Google's consent screen.
 * We call passport.authenticate() inline here rather than as middleware
 * in the route file, which keeps google.strategy.js neatly self-contained.
 */
const googleRedirect = (req, res, next) => {
  passport.authenticate("google", { session: false, scope: ["profile", "email"] })(req, res, next);
};

/**
 * Step 2 — Google redirects back here after the user grants consent.
 * Passport runs the strategy verify callback, which calls findOrCreateGoogleUser.
 * On success: issue JWT pair → redirect to frontend /auth/callback with tokens in query.
 * On failure: redirect to frontend /login with an error message.
 */
const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, user) => {
    if (err || !user) {
      const message = encodeURIComponent(
        err?.message || "Google sign-in failed. Please try again."
      );
      logger.warn(`[googleCallback] OAuth failed: ${err?.message}`);
      return res.redirect(`${env.frontendUrl}/login?error=${message}`);
    }

    try {
      const tokens = await authService.issueTokenPair(user, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Tokens go in the URL query string so the frontend SPA can read them
      // on the /auth/callback route, store them in Redux, and immediately
      // clean the URL (window.history.replaceState) so they don't persist
      // in browser history.
      const params = new URLSearchParams({
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      res.redirect(`${env.frontendUrl}/auth/callback?${params.toString()}`);
    } catch (tokenErr) {
      logger.error(`[googleCallback] Token issuance failed: ${tokenErr.message}`);
      res.redirect(`${env.frontendUrl}/login?error=Authentication+failed`);
    }
  })(req, res, next);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  changePassword,
  verifyEmail,
  resendVerification,
  googleRedirect,
  googleCallback,
};
