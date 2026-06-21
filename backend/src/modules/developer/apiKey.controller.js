const catchAsync = require("../../common/utils/catchAsync");
const service = require("./apiKey.service");

const generateKey = catchAsync(async (req, res) => {
  const result = await service.generateKey({ userId: req.user.id, label: req.body.label });
  res.status(201).json({ success: true, data: result });
});

const listKeys = catchAsync(async (req, res) => {
  const keys = await service.listKeys(req.user.id);
  res.status(200).json({ success: true, data: keys });
});

const revokeKey = catchAsync(async (req, res) => {
  const key = await service.revokeKey(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: key });
});

const setWebhookUrl = catchAsync(async (req, res) => {
  const key = await service.setWebhookUrl(req.user.id, req.params.id, req.body.webhookUrl);
  res.status(200).json({ success: true, data: key });
});

const getUsage = catchAsync(async (req, res) => {
  const analytics = await service.getUsageAnalytics(req.user.id, req.params.id, {
    days: parseInt(req.query.days, 10) || 7,
  });
  res.status(200).json({ success: true, data: analytics });
});

module.exports = { generateKey, listKeys, revokeKey, setWebhookUrl, getUsage };
