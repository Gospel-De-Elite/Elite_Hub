const { body, param } = require("express-validator");

const submitRequestValidation = [
  body("requestedRole").isIn(["RESELLER", "AGENT"]).withMessage("requestedRole must be RESELLER or AGENT"),
  body("reason").optional().trim().isLength({ max: 500 }),
];

const reviewRequestValidation = [
  param("id").isUUID().withMessage("Invalid request id"),
  body("action").isIn(["APPROVE", "REJECT"]).withMessage("action must be APPROVE or REJECT"),
  body("rejectionReason").optional().trim().isLength({ max: 500 }),
];

module.exports = { submitRequestValidation, reviewRequestValidation };
