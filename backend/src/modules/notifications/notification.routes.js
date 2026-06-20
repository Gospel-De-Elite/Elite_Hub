const express = require("express");
const { param } = require("express-validator");
const controller = require("./notification.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.listNotifications);
router.patch("/:id/read", [param("id").isUUID().withMessage("Invalid notification id")], validate, controller.markAsRead);

module.exports = router;
