const { body, param } = require("express-validator");

const providerIdValidation = [param("id").isUUID().withMessage("Invalid provider id")];

const updateProviderValidation = [
  param("id").isUUID().withMessage("Invalid provider id"),
  body("active").optional().isBoolean(),
  body("priority").optional().isInt({ min: 1 }),
  body("config").optional().isObject(),
];

module.exports = { providerIdValidation, updateProviderValidation };
