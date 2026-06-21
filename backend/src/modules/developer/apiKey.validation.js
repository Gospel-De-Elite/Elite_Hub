const { body, param, query } = require("express-validator");

const generateKeyValidation = [
  body("label").trim().notEmpty().isLength({ max: 100 }).withMessage("A label is required"),
];

const keyIdValidation = [param("id").isUUID().withMessage("Invalid API key id")];

const setWebhookValidation = [
  param("id").isUUID().withMessage("Invalid API key id"),
  body("webhookUrl")
    .isURL({ protocols: ["https"], require_protocol: true })
    .withMessage("webhookUrl must be a valid https URL"),
];

const usageQueryValidation = [
  param("id").isUUID().withMessage("Invalid API key id"),
  query("days").optional().isInt({ min: 1, max: 90 }),
];

module.exports = { generateKeyValidation, keyIdValidation, setWebhookValidation, usageQueryValidation };
