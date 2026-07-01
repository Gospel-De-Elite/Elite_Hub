const axios = require("axios");
const env   = require("../../../common/config/env");

/**
 * MultiTexter HTTP API v2 client.
 *
 * Implements:
 *   - sendSms          → POST /v2/app/sendsms  (API-key auth)
 *   - getBalance       → POST /v2/app/balance   (API-key auth)
 *   - getDeliveryReport→ POST /v2/app/message/report (API-key auth)
 *
 * MultiTexter does NOT expose a self-serve Sender ID registration API.
 * Sender ID registration is handled manually via their dashboard/support.
 * requestSenderId below is a no-op stub that records the intent locally
 * and lets the admin workflow continue; the carrier-submission step must
 * be done out-of-band via MultiTexter's dashboard.
 *
 * Response status codes (from MultiTexter docs):
 *   1    → success
 *  -2    → invalid parameter
 *  -3    → account suspended (fraudulent message)
 *  -4    → invalid display name (sender ID > 11 chars or disallowed)
 *  -5    → invalid message content
 *  -6    → invalid recipient
 *  -7    → insufficient units
 *  -10   → unknown error
 *   401  → unauthenticated (bad API key)
 */

const BASE_URL = "https://app.multitexter.com";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    Authorization: `Bearer ${env.multitexter.apiKey}`,
    Accept:        "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * Send an SMS to one recipient.
 *
 * @param {object} params
 * @param {string} params.to        - E.164 or local format, e.g. "2348012345678"
 * @param {string} params.from      - Sender ID (max 11 chars)
 * @param {string} params.sms       - Message body
 * @param {string} [params.sendtime]- Optional ISO datetime for scheduled send
 * @returns {{ success: boolean, providerMessageId: string|null, unitsUsed: number|null, raw: object }}
 */
async function sendSms({ to, from, sms, sendtime }) {
  const payload = {
    message:     sms,
    sender_name: from,
    recipients:  to,     // single recipient; campaign.service joins multiples with comma
    forcednd:    1,       // attempt delivery even if recipient is on DND list
  };

  if (sendtime) {
    payload.sendtime = sendtime;
  }

  const response = await client.post("/v2/app/sendsms", payload);
  return normalizeSendResponse(response.data);
}

/**
 * Send one SMS to multiple comma-separated recipients (bulk campaign path).
 * The worker calls sendSms per-message; this is exposed for direct bulk use.
 *
 * @param {object} params
 * @param {string}   params.from       - Sender ID
 * @param {string}   params.sms        - Message body
 * @param {string[]} params.recipients - Array of recipient numbers
 */
async function sendBulkSms({ from, sms, recipients }) {
  const payload = {
    message:     sms,
    sender_name: from,
    recipients:  recipients.join(","),
    forcednd:    1,
  };

  const response = await client.post("/v2/app/sendsms", payload);
  return normalizeSendResponse(response.data);
}

/**
 * Fetch the remaining SMS units on the MultiTexter account.
 * @returns {{ balance: number, raw: object }}
 */
async function getBalance() {
  const response = await client.post("/v2/app/balance");
  const raw = response.data;
  return { balance: raw.balance ?? null, raw };
}

/**
 * Fetch delivery reports, optionally filtered by msgids / date range.
 *
 * @param {object}   [filters]
 * @param {string}   [filters.msgids]    - Comma-separated message IDs
 * @param {string}   [filters.sender]    - Sender ID filter
 * @param {string}   [filters.startfrom] - Start date (YYYY-MM-DD)
 * @param {string}   [filters.endfrom]   - End date (YYYY-MM-DD)
 * @param {number}   [filters.page]      - Page number (default 1, 100 rows/page)
 */
async function getDeliveryReport(filters = {}) {
  const response = await client.post("/v2/app/message/report", filters);
  const raw = response.data;
  return {
    success: raw.status === 1,
    data:    raw.data  ?? [],
    total:   raw.total ?? 0,
    page:    raw.page  ?? 1,
    rows:    raw.rows  ?? 0,
    raw,
  };
}

/**
 * Stub: MultiTexter has no self-serve Sender ID registration API.
 * Returns a local-only acknowledgement so the senderId.service workflow
 * can continue to the SUBMITTED_TO_CARRIER step, which must be completed
 * manually via the MultiTexter dashboard.
 *
 * @param {object} params
 * @param {string} params.senderId
 */
async function requestSenderId({ senderId }) {
  // No API call — MultiTexter sender ID registration is dashboard-only.
  // Log the intent and return a placeholder so the service layer can
  // advance the state to SUBMITTED_TO_CARRIER and wait for admin input.
  return {
    raw: {
      note:      "MultiTexter does not expose a Sender ID registration API.",
      action:    "Register manually at https://web.multitexter.com/dashboard",
      sender_id: senderId,
    },
  };
}

// ─── Internal normalizers ────────────────────────────────────────────────────

/**
 * Normalise a MultiTexter send response into a consistent internal shape.
 * status === 1 is the only success indicator per the API docs.
 */
function normalizeSendResponse(raw) {
  const success = raw.status === 1;
  return {
    success,
    providerMessageId: raw.msgid  ? String(raw.msgid) : null,
    unitsUsed:         raw.units  ?? null,
    raw,
  };
}

module.exports = {
  sendSms,
  sendBulkSms,
  getBalance,
  getDeliveryReport,
  requestSenderId,
};
