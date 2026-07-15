'use strict';

const catchAsync = require('../../common/utils/catchAsync');
const service = require('./phonebook.service');

const createPhonebook = catchAsync(async (req, res) => {
  const phonebook = await service.createPhonebook({
    userId: req.user.id,
    name: req.body.name,
    description: req.body.description,
  });
  res.status(201).json({ success: true, data: phonebook });
});

const listPhonebooks = catchAsync(async (req, res) => {
  const phonebooks = await service.listPhonebooks(req.user.id);
  res.status(200).json({ success: true, data: phonebooks });
});

const getPhonebook = catchAsync(async (req, res) => {
  const phonebook = await service.getPhonebook(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: phonebook });
});

const updatePhonebook = catchAsync(async (req, res) => {
  const phonebook = await service.updatePhonebook({
    userId: req.user.id,
    phonebookId: req.params.id,
    name: req.body.name,
    description: req.body.description,
  });
  res.status(200).json({ success: true, data: phonebook });
});

const deletePhonebook = catchAsync(async (req, res) => {
  const result = await service.deletePhonebook(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});

const addContacts = catchAsync(async (req, res) => {
  const result = await service.addContacts({
    userId: req.user.id,
    phonebookId: req.params.id,
    contacts: req.body.contacts,
  });
  res.status(201).json({ success: true, data: result });
});

const deleteContact = catchAsync(async (req, res) => {
  const result = await service.deleteContact(req.user.id, req.params.id, req.params.contactId);
  res.status(200).json({ success: true, data: result });
});

const importCsv = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });
  }
  const result = await service.importCsv({
    userId: req.user.id,
    phonebookId: req.params.id,
    buffer: req.file.buffer,
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  createPhonebook,
  listPhonebooks,
  getPhonebook,
  updatePhonebook,
  deletePhonebook,
  addContacts,
  deleteContact,
  importCsv,
};
