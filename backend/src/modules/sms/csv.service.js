'use strict';

const { parse } = require('csv-parse/sync');

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

// Columns we recognise as phone number fields — case-insensitive match
const PHONE_COLUMNS = ['phone', 'mobile', 'number', 'recipient', 'phonenumber', 'mobile_number'];

/**
 * Normalise a raw phone value — strips spaces and dashes, converts
 * +234 prefix to 0 for consistency with how the rest of the platform
 * stores Nigerian numbers.
 */
function normalisePhone(raw) {
  if (!raw) return '';
  const stripped = String(raw).trim().replace(/[\s\-().]/g, '');
  if (stripped.startsWith('+234')) return '0' + stripped.slice(4);
  return stripped;
}

/**
 * Parse a CSV buffer and extract phone numbers.
 *
 * Accepts:
 *   - Single-column files (no header, or header that isn't a phone column name)
 *   - Multi-column files — picks the first column whose header matches PHONE_COLUMNS
 *
 * Returns:
 *   { valid: string[], invalid: Array<{row, value, reason}>, total, validCount, invalidCount }
 */
function parseContactsCsv(buffer) {
  let records;
  try {
    records = parse(buffer, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw new Error(`CSV parse error: ${err.message}`);
  }

  if (!records.length) {
    return { valid: [], invalid: [], total: 0, validCount: 0, invalidCount: 0 };
  }

  const valid = [];
  const invalid = [];

  // Detect if the first row looks like a header
  const firstRow = records[0];
  let phoneColIndex = -1;
  let startRow = 0;

  // Check if any cell in the first row matches a known phone column name
  for (let i = 0; i < firstRow.length; i++) {
    const cell = String(firstRow[i] || '').toLowerCase().replace(/[^a-z]/g, '');
    if (PHONE_COLUMNS.includes(cell)) {
      phoneColIndex = i;
      startRow = 1; // first row is a header, skip it
      break;
    }
  }

  // If no named column found, use column 0 for everything
  if (phoneColIndex === -1) {
    phoneColIndex = 0;
    // If the first row's value itself looks like a header (non-numeric), skip it
    const firstCell = normalisePhone(firstRow[0]);
    if (firstCell && !NG_PHONE_REGEX.test(firstCell) && isNaN(Number(firstRow[0]))) {
      startRow = 1;
    }
  }

  for (let i = startRow; i < records.length; i++) {
    const raw = records[i][phoneColIndex];
    const normalised = normalisePhone(raw);
    const rowNum = i + 1;

    if (!normalised) {
      invalid.push({ row: rowNum, value: raw ?? '', reason: 'empty value' });
      continue;
    }

    if (NG_PHONE_REGEX.test(normalised)) {
      valid.push(normalised);
    } else {
      invalid.push({ row: rowNum, value: raw, reason: 'not a valid Nigerian phone number' });
    }
  }

  return {
    valid,
    invalid,
    total: valid.length + invalid.length,
    validCount: valid.length,
    invalidCount: invalid.length,
  };
}

module.exports = { parseContactsCsv, normalisePhone, NG_PHONE_REGEX };
