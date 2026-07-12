"use strict";

const express    = require("express");
const controller = require("./auth.controller");
const validate   = require("../../common/middleware/validate");
const authenticate = require("../../common/middleware/authenticate");
const { authLimiter } = require("../../common/middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("./auth.validation");

const router = express.Router();

// ─── Standard auth ────────────────────────────────────────────────────────────
router.post("/register",        authLimiter, registerValidation,      validate, controller.register);
router.post("/login",           authLimiter, loginValidation,         validate, controller.login);
router.post("/refresh",         refreshValidation,                    validate, controller.refresh);
router.post("/logout",          refreshValidation,                    validate, controller.logout);
router.post("/logout-all",      authenticate,                                   controller.logoutAll);
router.post("/forgot-password", authLimiter, forgotPasswordValidation,validate, controller.forgotPassword);
router.post("/reset-password",  authLimiter, resetPasswordValidation, validate, controller.resetPassword);
router.get( "/me",              authenticate,                                   controller.getCurrentUser);
router.patch("/me",             authenticate,                                   controller.updateProfile);
router.post("/change-password", authenticate, changePasswordValidation,validate, controller.changePassword);

// ─── Email verification ───────────────────────────────────────────────────────
// GET  /auth/verify-email?token=xxx  — public, called from the email link
// POST /auth/resend-verification     — authenticated, soft rate-limited in service
router.get( "/verify-email",         controller.verifyEmail);
router.post("/resend-verification",  authenticate, controller.resendVerification);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// GET /auth/google          — browser navigates here to start OAuth flow
// GET /auth/google/callback — Google redirects here after consent
router.get("/google",          controller.googleRedirect);
router.get("/google/callback", controller.googleCallback);

module.exports = router;
