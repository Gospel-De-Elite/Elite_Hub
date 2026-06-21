const { body, param, query } = require("express-validator");

const listUsersValidation = [
  query("role").optional().isIn(["CUSTOMER", "RESELLER", "AGENT", "ADMIN", "SUPER_ADMIN"]),
  query("status").optional().isIn(["ACTIVE", "SUSPENDED", "BANNED"]),
];

const userIdValidation = [param("id").isUUID().withMessage("Invalid user id")];

const updateStatusValidation = [
  param("id").isUUID().withMessage("Invalid user id"),
  body("status").isIn(["ACTIVE", "SUSPENDED", "BANNED"]).withMessage("Invalid status"),
  body("reason").optional().trim().isLength({ max: 500 }),
];

const adjustWalletValidation = [
  param("id").isUUID().withMessage("Invalid user id"),
  body("amount").isFloat({ gt: 0 }).withMessage("amount must be a positive number"),
  body("direction").isIn(["CREDIT", "DEBIT"]).withMessage("direction must be CREDIT or DEBIT"),
  body("reason")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("A reason of at least 5 characters is required for a financial override"),
];

module.exports = { listUsersValidation, userIdValidation, updateStatusValidation, adjustWalletValidation };
