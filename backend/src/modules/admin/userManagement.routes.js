const express = require("express");
const controller = require("./userManagement.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const {
  listUsersValidation,
  userIdValidation,
  updateStatusValidation,
  adjustWalletValidation,
} = require("./userManagement.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", listUsersValidation, validate, controller.listUsers);
router.get("/:id", userIdValidation, validate, controller.getUserDetail);
router.patch("/:id/status", updateStatusValidation, validate, controller.updateStatus);

// Stricter than the router-level check above — ADMIN can view and suspend,
// only SUPER_ADMIN can move money without an order behind it.
router.post(
  "/:id/wallet-adjustment",
  authorize("SUPER_ADMIN"),
  adjustWalletValidation,
  validate,
  controller.adjustWallet
);

module.exports = router;
