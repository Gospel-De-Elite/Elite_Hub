'use strict';

const catchAsync = require('../../common/utils/catchAsync');
const service = require('./campaign.service');
const { parseContactsCsv } = require('./csv.service');

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

/**
 * POST /sms/campaigns/parse-csv
 * Accepts a multipart CSV upload, parses it, stores the valid numbers in
 * Redis with a 30-minute TTL, and returns the key + preview so the frontend
 * can show the user what was found before actually creating the campaign.
 */
const parseCSV = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
  }

  const result = parseContactsCsv(req.file.buffer);

  if (!result.validCount) {
    return res.status(422).json({
      success: false,
      message: 'No valid Nigerian phone numbers found in the CSV.',
      data: { invalid: result.invalid.slice(0, 20), total: result.total },
    });
  }

  // Store parsed numbers in Redis for 30 minutes — when the user submits
  // the campaign form they send this key instead of re-uploading the file.
  const parsedKey = await service.storeParsedContacts(req.user.id, result.valid);

  res.status(200).json({
    success: true,
    data: {
      parsedKey,
      validCount: result.validCount,
      invalidCount: result.invalidCount,
      total: result.total,
      preview: result.valid.slice(0, 5),
      invalidPreview: result.invalid.slice(0, 5),
    },
  });
});

module.exports = { createCampaign, listCampaigns, getCampaign, cancelCampaign, parseCSV };
