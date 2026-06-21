const express = require("express");
const catalogController = require("./esimCatalog.controller");
const orderController = require("./esimOrder.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const {
  createEsimProductValidation,
  updateEsimProductValidation,
  resolveDisputeValidation,
} = require("./esim.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/products", catalogController.listAllProducts);
router.post("/products", createEsimProductValidation, validate, catalogController.createProduct);
router.patch("/products/:id", updateEsimProductValidation, validate, catalogController.updateProduct);

router.get("/disputes", orderController.listDisputes);
router.patch("/disputes/:id/resolve", resolveDisputeValidation, validate, orderController.resolveDispute);

module.exports = router;
