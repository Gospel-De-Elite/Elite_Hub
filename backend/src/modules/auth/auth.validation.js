const { body } = require("express-validator");

const registerValidation = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("phone")
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage("A valid Nigerian phone number is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("referralCode").optional().trim(),
];

const loginValidation = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const refreshValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

const forgotPasswordValidation = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
};
