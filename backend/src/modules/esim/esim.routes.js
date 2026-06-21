const express = require("express");
const catalogController = require("./esimCatalog.controller");
const orderController = require("./esimOrder.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const {
  purchaseEsimValidation,
  orderIdValidation,
  openDisputeValidation,
} = require("./esim.validation");

const router = express.Router();

router.use(authenticate);

router.get("/products", catalogController.listProducts);
router.post("/orders", purchaseEsimValidation, validate, orderController.purchaseEsim);
router.get("/orders", orderController.listOrders);
router.get("/orders/:id", orderIdValidation, validate, orderController.getOrder);
router.get("/orders/:id/qrcode", orderIdValidation, validate, orderController.getQrCode);
router.post("/orders/:id/dispute", openDisputeValidation, validate, orderController.openDispute);

module.exports = router;
