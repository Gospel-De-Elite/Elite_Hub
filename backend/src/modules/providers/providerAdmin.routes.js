const express = require("express");
const controller = require("./providerAdmin.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const { providerIdValidation, updateProviderValidation } = require("./providerAdmin.validation");

const { param } = require("express-validator");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get( "/",                             controller.listProviders);
router.get( "/:id",                          providerIdValidation, validate, controller.getProvider);
router.patch("/:id",                         updateProviderValidation, validate, controller.updateProvider);
router.post("/:id/reset-health",             providerIdValidation, validate, controller.resetHealth);

// Catalog sync endpoints
router.get( "/:id/services",                 providerIdValidation, validate, controller.getProviderServices);
router.post("/:id/sync-catalog",             providerIdValidation, validate, controller.triggerCatalogSync);
router.get( "/:id/sync-catalog/history",     providerIdValidation, validate, controller.listSyncHistory);
router.get( "/:id/sync-catalog/:syncId",
  [
    ...providerIdValidation,
    param("syncId").isUUID().withMessage("Invalid syncId"),
  ],
  validate,
  controller.getSyncStatus
);

module.exports = router;
