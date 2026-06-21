const catchAsync = require("../../common/utils/catchAsync");
const service = require("./providerAdmin.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const listProviders = catchAsync(async (req, res) => {
  const providers = await service.listProviders();
  res.status(200).json({ success: true, data: providers });
});

const getProvider = catchAsync(async (req, res) => {
  const provider = await service.getProvider(req.params.id);
  res.status(200).json({ success: true, data: provider });
});

const updateProvider = catchAsync(async (req, res) => {
  const provider = await service.updateProvider(req.params.id, req.body, actorFrom(req));
  res.status(200).json({ success: true, data: provider });
});

const resetHealth = catchAsync(async (req, res) => {
  const health = await service.resetHealth(req.params.id, actorFrom(req));
  res.status(200).json({ success: true, data: health });
});

module.exports = { listProviders, getProvider, updateProvider, resetHealth };
