'use strict';

const { parse } = require('csv-parse/sync');

const NG_PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;

/**
 * Column header names we recognise as phone number fields.
 * Applied after stripping all non-alpha characters and lowercasing,
 * so "Mobile Phone", "Mobile_Number", "Cell Phone" etc. all match.
 */
const PHONE_COLUMNS = [
  'phone',
  'mobile',
  'mobilenumber',
  'mobilephone',
  'number',
  'recipient',
  'phonenumber',
  'cellphone',
  'cell',
  'telephone',
  'tel',
  'contact',
  'contactnumber',
];

/**
 * Normalise a raw phone value:
 *   - Strips whitespace, dashes, parentheses, dots
 *   - +234XXXXXXXXXX → 0XXXXXXXXXX
 *   - 234XXXXXXXXXX  → 0XXXXXXXXXX  (missing + prefix)
 *   - 7XXXXXXXXX     → 07XXXXXXXXX  (10-digit, missing leading 0)
 *   - 8XXXXXXXXX     → 08XXXXXXXXX
 *   - 9XXXXXXXXX     → 09XXXXXXXXX
 *
 * The third case handles CSVs exported from apps that strip the leading 0,
 * e.g. Google Contacts which stores "7040688579" instead of "07040688579".
 */
function normalisePhone(raw) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/[\s\-().+]/g, '');

  // +234 or 234 prefix → local 0 format
  if (s.startsWith('234')) return '0' + s.slice(3);

  // 10-digit number starting with 7, 8, or 9 — prepend 0
  if (/^[789]\d{9}$/.test(s)) return '0' + s;

  return s;
}

/**
 * Parse a CSV buffer and extract Nigerian phone numbers.
 *
 * Column detection order:
 *   1. Any column whose header normalises to a known phone column name
 *   2. First column containing phone-looking values (fallback for
 *      headerless or unusually-named CSVs)
 *   3. Column 0 (last resort)
 *
 * Returns:
 *   { valid, invalid, total, validCount, invalidCount }
 */
function parseContactsCsv(buffer) {
  let records;
  try {
    records = parse(buffer, {
      skip_empty_lines: true,
      trim:             true,
      relax_column_count: true,
    });
  } catch (err) {
    throw new Error(`CSV parse error: ${err.message}`);
  }

  if (!records.length) {
    return { valid: [], invalid: [], total: 0, validCount: 0, invalidCount: 0 };
  }

  const valid   = [];
  const invalid = [];

  const firstRow = records[0];
  let phoneColIndex = -1;
  let startRow      = 0;

  // ── Pass 1: named header column ──────────────────────────────────────────
  for (let i = 0; i < firstRow.length; i++) {
    const cell = String(firstRow[i] || '').toLowerCase().replace(/[^a-z]/g, '');
    if (PHONE_COLUMNS.includes(cell)) {
      phoneColIndex = i;
      startRow      = 1;
      break;
    }
  }

  // ── Pass 2: scan columns for phone-looking values ─────────────────────────
  // If no named header found, scan each column in the data rows to find
  // whichever one contains the most phone-looking values.
  if (phoneColIndex === -1 && records.length > 1) {
    const colScores = new Array(firstRow.length).fill(0);
    const sampleRows = records.slice(1, Math.min(6, records.length)); // check first 5 data rows

    for (const row of sampleRows) {
      for (let i = 0; i < row.length; i++) {
        const norm = normalisePhone(row[i]);
        if (NG_PHONE_REGEX.test(norm)) colScores[i]++;
      }
    }

    const bestScore = Math.max(...colScores);
    if (bestScore > 0) {
      phoneColIndex = colScores.indexOf(bestScore);
      // First row might be a header — skip it if it doesn't look like a phone
      const firstCellNorm = normalisePhone(firstRow[phoneColIndex]);
      if (!NG_PHONE_REGEX.test(firstCellNorm)) {
        startRow = 1;
      }
    }
  }

  // ── Pass 3: last resort — use column 0 ───────────────────────────────────
  if (phoneColIndex === -1) {
    phoneColIndex = 0;
    const firstCellNorm = normalisePhone(firstRow[0]);
    if (firstCellNorm && !NG_PHONE_REGEX.test(firstCellNorm)) {
      startRow = 1; // first row looks like a header
    }
  }

  // ── Extract and validate ──────────────────────────────────────────────────
  for (let i = startRow; i < records.length; i++) {
    const raw        = records[i][phoneColIndex];
    const normalised = normalisePhone(raw);
    const rowNum     = i + 1;

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
    total:        valid.length + invalid.length,
    validCount:   valid.length,
    invalidCount: invalid.length,
  };
}

module.exports = { parseContactsCsv, normalisePhone, NG_PHONE_REGEX };
