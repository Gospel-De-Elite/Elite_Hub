const express = require("express");
const { param } = require("express-validator");
const controller = require("./supportAdmin.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/escalated", controller.listEscalated);
router.get("/:id", [param("id").isUUID().withMessage("Invalid conversation id")], validate, controller.getConversation);
router.patch(
  "/:id/resolve",
  [param("id").isUUID().withMessage("Invalid conversation id")],
  validate,
  controller.markResolved
);

module.exports = router;
