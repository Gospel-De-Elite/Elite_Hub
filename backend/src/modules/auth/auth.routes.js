const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../common/middleware/validate");
const authenticate = require("../../common/middleware/authenticate");
const { authLimiter } = require("../../common/middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("./auth.validation");

const router = express.Router();

router.post("/register", authLimiter, registerValidation, validate, controller.register);
router.post("/login", authLimiter, loginValidation, validate, controller.login);
router.post("/refresh", refreshValidation, validate, controller.refresh);
router.post("/logout", refreshValidation, validate, controller.logout);
router.post("/logout-all", authenticate, controller.logoutAll);
router.post("/forgot-password", authLimiter, forgotPasswordValidation, validate, controller.forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordValidation, validate, controller.resetPassword);
router.get("/me", authenticate, controller.getCurrentUser);

module.exports = router;
