const express = require("express");
const { body } = require("express-validator");
const controller = require("./smsWallet.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.getWallet);

// Fixed-bundle purchase — user selects a pre-built product
router.post(
  "/purchase",
  [body("productId").isUUID().withMessage("A valid productId is required")],
  validate,
  controller.purchaseCredits
);

// Custom-unit purchase — user specifies exact unit count
// Min 10, max 100,000, must be a positive integer
router.post(
  "/purchase-custom",
  [
    body("units")
      .isInt({ min: 10, max: 100_000 })
      .withMessage("Units must be a whole number between 10 and 100,000"),
  ],
  validate,
  controller.purchaseCustomCredits
);

module.exports = router;
