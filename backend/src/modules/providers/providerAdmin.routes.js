const express = require("express");
const controller = require("./providerAdmin.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const { providerIdValidation, updateProviderValidation } = require("./providerAdmin.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", controller.listProviders);
router.get("/:id", providerIdValidation, validate, controller.getProvider);
router.patch("/:id", updateProviderValidation, validate, controller.updateProvider);
router.post("/:id/reset-health", providerIdValidation, validate, controller.resetHealth);

module.exports = router;
