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

const triggerCatalogSync = catchAsync(async (req, res) => {
  const sync = await service.triggerCatalogSync(req.params.id, actorFrom(req));
  res.status(202).json({ success: true, data: sync });
});

const getProviderServices = catchAsync(async (req, res) => {
  const data = await service.getProviderServices(req.params.id);
  res.status(200).json({ success: true, data });
});

const getSyncStatus = catchAsync(async (req, res) => {
  const sync = await service.getSyncStatus(req.params.syncId);
  res.status(200).json({ success: true, data: sync });
});

const listSyncHistory = catchAsync(async (req, res) => {
  const history = await service.listSyncHistory(req.params.id);
  res.status(200).json({ success: true, data: history });
});

module.exports = {
  listProviders,
  getProvider,
  updateProvider,
  resetHealth,
  triggerCatalogSync,
  getProviderServices,
  getSyncStatus,
  listSyncHistory,
};
