const catchAsync = require("../../common/utils/catchAsync");
const service = require("./userManagement.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const listUsers = catchAsync(async (req, res) => {
  const { page, limit, role, status, search } = req.query;
  const result = await service.listUsers({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    role,
    status,
    search,
  });
  res.status(200).json({ success: true, data: result });
});

const getUserDetail = catchAsync(async (req, res) => {
  const user = await service.getUserDetail(req.params.id);
  res.status(200).json({ success: true, data: user });
});

const updateStatus = catchAsync(async (req, res) => {
  const user = await service.updateStatus({
    userId: req.params.id,
    status: req.body.status,
    reason: req.body.reason,
    actor: actorFrom(req),
  });
  res.status(200).json({ success: true, data: user });
});

const adjustWallet = catchAsync(async (req, res) => {
  const result = await service.adjustWallet({
    userId: req.params.id,
    amount: req.body.amount,
    direction: req.body.direction,
    reason: req.body.reason,
    actor: actorFrom(req),
  });
  res.status(200).json({ success: true, data: result });
});

const assignRole = catchAsync(async (req, res) => {
  const result = await service.assignRole({
    userId:      req.params.id,
    newRoleName: req.body.role,
    // Pass the actor's role name so the service can enforce ADMIN vs SUPER_ADMIN rules
    actor: { ...actorFrom(req), role: req.user.role },
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = { listUsers, getUserDetail, updateStatus, adjustWallet, assignRole };
