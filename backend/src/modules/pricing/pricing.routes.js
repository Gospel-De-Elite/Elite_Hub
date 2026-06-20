const express = require("express");
const controller = require("./pricing.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const {
  createProductValidation,
  updateProductValidation,
  upsertPricingValidation,
} = require("./pricing.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/categories", controller.listCategories);
router.get("/products", controller.listProducts);
router.get("/products/:id", controller.getProduct);
router.post("/products", createProductValidation, validate, controller.createProduct);
router.patch("/products/:id", updateProductValidation, validate, controller.updateProduct);
router.put("/products/:id/pricing", upsertPricingValidation, validate, controller.upsertPricing);

module.exports = router;
