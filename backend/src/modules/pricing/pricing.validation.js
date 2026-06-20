const { body, param } = require("express-validator");

const ALLOWED_ROLES = ["CUSTOMER", "RESELLER", "AGENT", "ADMIN", "SUPER_ADMIN"];

const createProductValidation = [
  body("categoryId").isUUID().withMessage("A valid categoryId is required"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("code").trim().notEmpty().withMessage("Code is required"),
  body("providerCost").isFloat({ min: 0 }).withMessage("providerCost must be a non-negative number"),
];

const updateProductValidation = [
  param("id").isUUID().withMessage("Invalid product id"),
  body("name").optional().trim().notEmpty(),
  body("providerCost").optional().isFloat({ min: 0 }),
  body("active").optional().isBoolean(),
];

const upsertPricingValidation = [
  param("id").isUUID().withMessage("Invalid product id"),
  body().custom((value) => {
    const keys = Object.keys(value);
    if (keys.length === 0) throw new Error("At least one role price is required");

    for (const key of keys) {
      if (!ALLOWED_ROLES.includes(key)) {
        throw new Error(`Unknown role: ${key}`);
      }
      if (typeof value[key] !== "number" || value[key] < 0) {
        throw new Error(`Price for ${key} must be a non-negative number`);
      }
    }
    return true;
  }),
];

module.exports = { createProductValidation, updateProductValidation, upsertPricingValidation };
