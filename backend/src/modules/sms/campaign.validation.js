const { body, param } = require("express-validator");

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

const createCampaignValidation = [
  body("campaignName").trim().notEmpty().withMessage("Campaign name is required"),
  body("message")
    .trim()
    .notEmpty()
    .isLength({ max: 480 })
    .withMessage("Message is required (max 480 characters, ~3 SMS segments)"),
  body("recipients")
    .isArray({ min: 1, max: 5000 })
    .withMessage("Provide between 1 and 5000 recipients"),
  body("recipients.*")
    .matches(NG_PHONE_REGEX)
    .withMessage("All recipients must be valid Nigerian phone numbers"),
  body("scheduledAt").optional().isISO8601().withMessage("scheduledAt must be a valid date"),
];

const campaignIdValidation = [param("id").isUUID().withMessage("Invalid campaign id")];

module.exports = { createCampaignValidation, campaignIdValidation };
