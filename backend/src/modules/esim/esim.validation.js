const { body, param } = require("express-validator");

const createEsimProductValidation = [
  body("country").trim().notEmpty().withMessage("Country is required"),
  body("countryCode").trim().notEmpty().isLength({ max: 10 }).withMessage("countryCode is required"),
  body("packageName").trim().notEmpty().withMessage("packageName is required"),
  body("dataAllowance").trim().notEmpty().withMessage("dataAllowance is required"),
  body("validity").trim().notEmpty().withMessage("validity is required"),
  body("costPrice").isFloat({ min: 0 }).withMessage("costPrice must be a non-negative number"),
  body("sellingPrice").isFloat({ min: 0 }).withMessage("sellingPrice must be a non-negative number"),
  body("providerCode").optional().trim(),
];

const updateEsimProductValidation = [
  param("id").isUUID().withMessage("Invalid product id"),
  body("sellingPrice").optional().isFloat({ min: 0 }),
  body("costPrice").optional().isFloat({ min: 0 }),
  body("active").optional().isBoolean(),
];

const purchaseEsimValidation = [
  body("esimProductId").isUUID().withMessage("A valid esimProductId is required"),
];

const orderIdValidation = [param("id").isUUID().withMessage("Invalid order id")];

const openDisputeValidation = [
  param("id").isUUID().withMessage("Invalid order id"),
  body("reason").trim().notEmpty().isLength({ max: 1000 }).withMessage("A dispute reason is required"),
];

const resolveDisputeValidation = [
  param("id").isUUID().withMessage("Invalid order id"),
  body("resolution").isIn(["REFUND", "REJECT"]).withMessage("resolution must be REFUND or REJECT"),
  body("adminNotes").optional().trim().isLength({ max: 1000 }),
];

module.exports = {
  createEsimProductValidation,
  updateEsimProductValidation,
  purchaseEsimValidation,
  orderIdValidation,
  openDisputeValidation,
  resolveDisputeValidation,
};
