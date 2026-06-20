const express = require("express");
const controller = require("./roleUpgrade.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const { reviewRequestValidation } = require("./roleUpgrade.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", controller.listPendingRequests);
router.patch("/:id", reviewRequestValidation, validate, controller.reviewRequest);

module.exports = router;
