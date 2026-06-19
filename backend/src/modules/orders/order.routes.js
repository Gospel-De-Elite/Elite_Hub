const express = require("express");
const controller = require("./order.controller");
const validate = require("../../common/middleware/validate");
const authenticate = require("../../common/middleware/authenticate");
const {
  airtimeValidation,
  dataValidation,
  electricityValidation,
  tvValidation,
  getOrderValidation,
} = require("./order.validation");

const router = express.Router();

router.use(authenticate);

router.post("/airtime", airtimeValidation, validate, controller.buyAirtime);
router.post("/data", dataValidation, validate, controller.buyData);
router.post("/electricity", electricityValidation, validate, controller.buyElectricity);
router.post("/tv", tvValidation, validate, controller.buyTv);
router.get("/", controller.listOrders);
router.get("/:id", getOrderValidation, validate, controller.getOrder);

module.exports = router;
