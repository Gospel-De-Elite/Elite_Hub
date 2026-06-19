const { body, param } = require("express-validator");

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

const airtimeValidation = [
  body("productId").isUUID().withMessage("A valid productId is required"),
  body("recipientNumber").matches(NG_PHONE_REGEX).withMessage("A valid Nigerian phone number is required"),
];

const dataValidation = [
  body("productId").isUUID().withMessage("A valid productId is required"),
  body("recipientNumber").matches(NG_PHONE_REGEX).withMessage("A valid Nigerian phone number is required"),
];

const electricityValidation = [
  body("productId").isUUID().withMessage("A valid productId is required"),
  body("meterNumber").trim().notEmpty().withMessage("Meter number is required"),
  body("meterType").isIn(["PREPAID", "POSTPAID"]).withMessage("meterType must be PREPAID or POSTPAID"),
  body("billAmount").isFloat({ gt: 0 }).withMessage("billAmount must be a positive number"),
];

const tvValidation = [
  body("productId").isUUID().withMessage("A valid productId is required"),
  body("smartcardNumber").trim().notEmpty().withMessage("Smartcard number is required"),
];

const getOrderValidation = [param("id").isUUID().withMessage("Invalid order id")];

module.exports = {
  airtimeValidation,
  dataValidation,
  electricityValidation,
  tvValidation,
  getOrderValidation,
};
