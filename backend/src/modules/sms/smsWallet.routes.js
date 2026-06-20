const express = require("express");
const { body } = require("express-validator");
const controller = require("./smsWallet.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.getWallet);
router.post(
  "/purchase",
  [body("productId").isUUID().withMessage("A valid productId is required")],
  validate,
  controller.purchaseCredits
);

module.exports = router;
