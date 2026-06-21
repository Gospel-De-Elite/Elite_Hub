const catchAsync = require("../../common/utils/catchAsync");
const service = require("./auditLog.service");

const listAuditLogs = catchAsync(async (req, res) => {
  const { page, limit, actorId, entityType, action, from, to } = req.query;
  const result = await service.listAuditLogs({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 50,
    actorId,
    entityType,
    action,
    from,
    to,
  });
  res.status(200).json({ success: true, data: result });
});

const getAuditLog = catchAsync(async (req, res) => {
  const log = await service.getAuditLog(req.params.id);
  res.status(200).json({ success: true, data: log });
});

module.exports = { listAuditLogs, getAuditLog };
