const express = require("express");
const controller = require("./auditLog.controller");
const authenticate = require("../../common/middleware/authenticate");
const authorize = require("../../common/middleware/authorize");
const validate = require("../../common/middleware/validate");
const { listAuditLogsValidation, auditLogIdValidation } = require("./auditLog.validation");

const router = express.Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", listAuditLogsValidation, validate, controller.listAuditLogs);
router.get("/:id", auditLogIdValidation, validate, controller.getAuditLog);

module.exports = router;
