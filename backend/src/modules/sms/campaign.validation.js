'use strict';

const { body, param } = require('express-validator');

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

const createCampaignValidation = [
  body('campaignName').trim().notEmpty().withMessage('Campaign name is required'),
  body('message')
    .trim()
    .notEmpty()
    .isLength({ max: 480 })
    .withMessage('Message is required (max 480 characters)'),

  // Recipients can come from three sources — direct array, parsedKey, or phonebookId.
  // At least one must be present.
  body().custom((_, { req }) => {
    const { recipients, parsedKey, phonebookId } = req.body;
    const hasRecipients = Array.isArray(recipients) && recipients.length > 0;
    if (!hasRecipients && !parsedKey && !phonebookId) {
      throw new Error(
        'Provide recipients as an array, a parsedKey from CSV upload, or a phonebookId'
      );
    }
    return true;
  }),

  body('recipients')
    .optional()
    .isArray({ min: 1, max: 5000 })
    .withMessage('Recipients must be between 1 and 5000'),
  body('recipients.*')
    .optional()
    .matches(NG_PHONE_REGEX)
    .withMessage('All recipients must be valid Nigerian phone numbers'),

  body('parsedKey').optional().isString().withMessage('parsedKey must be a string'),

  body('phonebookId').optional().isUUID().withMessage('phonebookId must be a valid UUID'),

  body('scheduledAt').optional().isISO8601().withMessage('scheduledAt must be a valid date'),
];

const campaignIdValidation = [param('id').isUUID().withMessage('Invalid campaign id')];

module.exports = { createCampaignValidation, campaignIdValidation };
