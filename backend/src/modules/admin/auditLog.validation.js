const { param, query } = require("express-validator");

const listAuditLogsValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 200 }),
  query("from").optional().isISO8601().withMessage("from must be a valid date"),
  query("to").optional().isISO8601().withMessage("to must be a valid date"),
];

const auditLogIdValidation = [param("id").isUUID().withMessage("Invalid audit log id")];

module.exports = { listAuditLogsValidation, auditLogIdValidation };
