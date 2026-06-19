const express = require("express");
const webhookController = require("./webhook.controller");

const router = express.Router();

// No auth/role middleware on these — Paystack and Monnify call them
// directly. Signature verification inside each handler is the real
// security boundary, not session auth.
router.post("/paystack", webhookController.paystackWebhook);
router.post("/monnify", webhookController.monnifyWebhook);

module.exports = router;
