'use strict';

const { body, param } = require('express-validator');

const phonebookIdParam = [param('id').isUUID().withMessage('Invalid phonebook id')];

const createPhonebookValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required (max 100 chars)'),
  body('description').optional().trim().isLength({ max: 500 }),
];

const updatePhonebookValidation = [
  param('id').isUUID().withMessage('Invalid phonebook id'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

const addContactsValidation = [
  param('id').isUUID().withMessage('Invalid phonebook id'),
  body('contacts')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Provide between 1 and 1000 contacts'),
];

const contactIdParam = [
  param('id').isUUID().withMessage('Invalid phonebook id'),
  param('contactId').isUUID().withMessage('Invalid contact id'),
];

module.exports = {
  phonebookIdParam,
  createPhonebookValidation,
  updatePhonebookValidation,
  addContactsValidation,
  contactIdParam,
};
