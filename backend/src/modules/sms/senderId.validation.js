const { body, param } = require("express-validator");

const submitRequestValidation = [
  body("requestedSenderId")
    .trim()
    .isLength({ min: 3, max: 11 })
    .withMessage("Sender ID must be 3-11 characters")
    .matches(/^[A-Za-z0-9 ]+$/)
    .withMessage("Sender ID must be alphanumeric"),
];

const reviewValidation = [
  param("id").isUUID().withMessage("Invalid request id"),
  body("action").isIn(["APPROVE", "REJECT"]).withMessage("action must be APPROVE or REJECT"),
  body("rejectionReason").optional().trim().isLength({ max: 500 }),
];

const submitToCarrierValidation = [param("id").isUUID().withMessage("Invalid request id")];

const carrierDecisionValidation = [
  param("id").isUUID().withMessage("Invalid request id"),
  body("status").isIn(["ACTIVE", "REJECTED"]).withMessage("status must be ACTIVE or REJECTED"),
  body("carrierRejectionReason").optional().trim().isLength({ max: 500 }),
];

module.exports = {
  submitRequestValidation,
  reviewValidation,
  submitToCarrierValidation,
  carrierDecisionValidation,
};
