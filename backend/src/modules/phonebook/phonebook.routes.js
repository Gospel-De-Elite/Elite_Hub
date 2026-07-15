'use strict';

const express = require('express');
const multer = require('multer');
const controller = require('./phonebook.controller');
const authenticate = require('../../common/middleware/authenticate');
const validate = require('../../common/middleware/validate');
const {
  phonebookIdParam,
  createPhonebookValidation,
  updatePhonebookValidation,
  addContactsValidation,
  contactIdParam,
} = require('./phonebook.validation');

const router = express.Router();

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

router.post('/', createPhonebookValidation, validate, controller.createPhonebook);
router.get('/', controller.listPhonebooks);
router.get('/:id', phonebookIdParam, validate, controller.getPhonebook);
router.patch('/:id', updatePhonebookValidation, validate, controller.updatePhonebook);
router.delete('/:id', phonebookIdParam, validate, controller.deletePhonebook);

router.post('/:id/contacts', addContactsValidation, validate, controller.addContacts);
router.delete('/:id/contacts/:contactId', contactIdParam, validate, controller.deleteContact);
router.post('/:id/import-csv', phonebookIdParam, validate, upload.single('file'), controller.importCsv);

module.exports = router;
