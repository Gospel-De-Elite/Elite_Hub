const express = require("express");
const controller = require("./senderId.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const {
  reviewValidation,
  submitToCarrierValidation,
  carrierDecisionValidation,
} = require("./senderId.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", controller.listAllRequests);
router.patch("/:id/review", reviewValidation, validate, controller.review);
router.post("/:id/submit-to-carrier", submitToCarrierValidation, validate, controller.submitToCarrier);
router.patch("/:id/carrier-status", carrierDecisionValidation, validate, controller.recordCarrierDecision);

module.exports = router;
