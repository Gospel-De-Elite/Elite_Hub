const express = require("express");
const controller = require("./apiKey.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const {
  generateKeyValidation,
  keyIdValidation,
  setWebhookValidation,
  usageQueryValidation,
} = require("./apiKey.validation");

const router = express.Router();

router.use(authenticate);

router.post("/", generateKeyValidation, validate, controller.generateKey);
router.get("/", controller.listKeys);
router.patch("/:id/revoke", keyIdValidation, validate, controller.revokeKey);
router.patch("/:id/webhook", setWebhookValidation, validate, controller.setWebhookUrl);
router.get("/:id/usage", usageQueryValidation, validate, controller.getUsage);

module.exports = router;
