'use strict';

const prisma = require('../../common/config/prisma');
const ApiError = require('../../common/errors/ApiError');
const { parseContactsCsv, normalisePhone, NG_PHONE_REGEX } = require('../sms/csv.service');

// ── Phonebook CRUD ────────────────────────────────────────────────────────────

async function createPhonebook({ userId, name, description }) {
  return prisma.phonebook.create({ data: { userId, name, description } });
}

async function listPhonebooks(userId) {
  const phonebooks = await prisma.phonebook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { contacts: true } } },
  });
  return phonebooks.map((p) => ({ ...p, contactCount: p._count.contacts, _count: undefined }));
}

async function getPhonebook(userId, phonebookId) {
  const phonebook = await prisma.phonebook.findFirst({
    where: { id: phonebookId, userId },
    include: {
      contacts: { orderBy: { createdAt: 'desc' } },
      _count: { select: { contacts: true } },
    },
  });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');
  return { ...phonebook, contactCount: phonebook._count.contacts, _count: undefined };
}

async function updatePhonebook({ userId, phonebookId, name, description }) {
  const phonebook = await prisma.phonebook.findFirst({ where: { id: phonebookId, userId } });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');
  return prisma.phonebook.update({
    where: { id: phonebookId },
    data: { ...(name && { name }), ...(description !== undefined && { description }) },
  });
}

async function deletePhonebook(userId, phonebookId) {
  const phonebook = await prisma.phonebook.findFirst({ where: { id: phonebookId, userId } });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');
  // Cascade delete handles contacts via the schema relation
  await prisma.phonebook.delete({ where: { id: phonebookId } });
  return { deleted: true };
}

// ── Contact management ────────────────────────────────────────────────────────

async function addContacts({ userId, phonebookId, contacts }) {
  const phonebook = await prisma.phonebook.findFirst({ where: { id: phonebookId, userId } });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');

  const valid = [];
  const invalid = [];

  for (const c of contacts) {
    const phone = normalisePhone(c.phone || c);
    if (NG_PHONE_REGEX.test(phone)) {
      valid.push({ phonebookId, phone, name: c.name || null });
    } else {
      invalid.push({ value: c.phone || c, reason: 'not a valid Nigerian phone number' });
    }
  }

  let added = 0;
  if (valid.length) {
    // createMany with skipDuplicates respects the unique(phonebookId, phone) constraint
    const result = await prisma.phonebookContact.createMany({
      data: valid,
      skipDuplicates: true,
    });
    added = result.count;
  }

  return { added, skipped: valid.length - added, invalid };
}

async function deleteContact(userId, phonebookId, contactId) {
  // Verify the phonebook belongs to this user before deleting a contact from it
  const phonebook = await prisma.phonebook.findFirst({ where: { id: phonebookId, userId } });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');

  const contact = await prisma.phonebookContact.findFirst({
    where: { id: contactId, phonebookId },
  });
  if (!contact) throw ApiError.notFound('Contact not found');

  await prisma.phonebookContact.delete({ where: { id: contactId } });
  return { deleted: true };
}

/**
 * Import contacts from a CSV buffer into an existing phonebook.
 * Returns the same summary shape as addContacts so the frontend
 * can display consistent feedback regardless of import method.
 */
async function importCsv({ userId, phonebookId, buffer }) {
  const phonebook = await prisma.phonebook.findFirst({ where: { id: phonebookId, userId } });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');

  const parsed = parseContactsCsv(buffer);

  if (!parsed.validCount) {
    throw ApiError.unprocessableEntity(
      'No valid Nigerian phone numbers found in the uploaded file'
    );
  }

  const data = parsed.valid.map((phone) => ({ phonebookId, phone, name: null }));
  const result = await prisma.phonebookContact.createMany({ data, skipDuplicates: true });

  return {
    added: result.count,
    skipped: parsed.validCount - result.count,
    invalid: parsed.invalid.slice(0, 20),
    invalidCount: parsed.invalidCount,
    total: parsed.total,
  };
}

/**
 * Retrieve all phone numbers from a phonebook — used by campaign creation
 * when the user selects "From Phonebook" as the recipient source.
 */
async function getPhonebookNumbers(userId, phonebookId) {
  const phonebook = await prisma.phonebook.findFirst({
    where: { id: phonebookId, userId },
    include: { contacts: { select: { phone: true } } },
  });
  if (!phonebook) throw ApiError.notFound('Phonebook not found');
  return phonebook.contacts.map((c) => c.phone);
}

module.exports = {
  createPhonebook,
  listPhonebooks,
  getPhonebook,
  updatePhonebook,
  deletePhonebook,
  addContacts,
  deleteContact,
  importCsv,
  getPhonebookNumbers,
};
