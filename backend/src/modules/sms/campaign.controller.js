const catchAsync = require("../../common/utils/catchAsync");
const service = require("./campaign.service");

const createCampaign = catchAsync(async (req, res) => {
  const campaign = await service.createCampaign({
    userId: req.user.id,
    campaignName: req.body.campaignName,
    message: req.body.message,
    recipients: req.body.recipients,
    scheduledAt: req.body.scheduledAt,
  });
  res.status(201).json({ success: true, data: campaign });
});

const listCampaigns = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await service.listCampaigns(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });
  res.status(200).json({ success: true, data: result });
});

const getCampaign = catchAsync(async (req, res) => {
  const campaign = await service.getCampaign(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: campaign });
});

const cancelCampaign = catchAsync(async (req, res) => {
  const result = await service.cancelCampaign(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

module.exports = { createCampaign, listCampaigns, getCampaign, cancelCampaign };
