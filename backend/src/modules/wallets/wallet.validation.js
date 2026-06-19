const { body } = require("express-validator");

const initializeFundingValidation = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
  body("gateway")
    .isIn(["PAYSTACK", "MONNIFY"])
    .withMessage("Gateway must be PAYSTACK or MONNIFY"),
];

module.exports = { initializeFundingValidation };
