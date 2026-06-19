const express = require("express");
const walletController = require("./wallet.controller");
const paymentController = require("./payment.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const { initializeFundingValidation } = require("./wallet.validation");

const router = express.Router();

router.use(authenticate);

router.get("/", walletController.getWallet);
router.get("/transactions", walletController.getTransactions);
router.post("/fund/initialize", initializeFundingValidation, validate, paymentController.initialize);
router.get("/fund/verify/:reference", paymentController.verify);

module.exports = router;
