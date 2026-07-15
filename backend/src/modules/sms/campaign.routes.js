'use strict';

const express = require('express');
const multer = require('multer');
const controller = require('./campaign.controller');
const authenticate = require('../../common/middleware/authenticate');
const validate = require('../../common/middleware/validate');
const { createCampaignValidation, campaignIdValidation } = require('./campaign.validation');

const router = express.Router();

// In-memory storage — CSV files are parsed and discarded immediately;
// we never write them to disk. 5MB is generous for a contact list.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

router.use(authenticate);

router.post('/parse-csv', upload.single('file'), controller.parseCSV);
router.post('/', createCampaignValidation, validate, controller.createCampaign);
router.get('/', controller.listCampaigns);
router.get('/:id', campaignIdValidation, validate, controller.getCampaign);
router.post('/:id/cancel', campaignIdValidation, validate, controller.cancelCampaign);

module.exports = router;
