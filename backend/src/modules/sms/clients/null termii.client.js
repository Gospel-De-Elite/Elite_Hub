const axios = require("axios");
const env = require("../../../common/config/env");

// NOTE: Termii's exact field names below are illustrative, based on their
// commonly documented v1 API shape. Confirm against your live Termii
// account docs once you have real credentials, and adjust normalizeSendResponse
// / normalizeSenderIdStatus if needed — those are the only places that
// should require changes.
//
// Sender ID approval at Termii is typically a manual compliance review on
// their end (24-48hrs, communicated via dashboard/email) rather than a
// fully self-serve API with a reliable status-check endpoint — so
// checkSenderIdStatus below is best-effort only and unused by any worker.
// The admin-facing recordCarrierDecision flow (see senderId.service.js) is
// the reliable path for resolving SUBMITTED_TO_CARRIER requests.

const client = axios.create({
  baseURL: env.termii.baseUrl,
  timeout: 15000,
});

async function sendSms({ to, from, sms }) {
  const response = await client.post("/sms/send", {
    api_key: env.termii.apiKey,
    to,
    from,
    sms,
    type: "plain",
    channel: "generic",
  });

  return normalizeSendResponse(response.data);
}

async function requestSenderId({ senderId, usecase, company }) {
  const response = await client.post("/sender-id/request", {
    api_key: env.termii.apiKey,
    sender_id: senderId,
    usecase,
    company,
  });

  return { raw: response.data };
}

async function checkSenderIdStatus(senderId) {
  const response = await client.get(`/sender-id/${senderId}/status`, {
    params: { api_key: env.termii.apiKey },
  });
  return normalizeSenderIdStatus(response.data);
}

function normalizeSendResponse(raw) {
  const success = raw.message === "Successfully Sent" || raw.code === "ok";
  return { success, providerMessageId: raw.message_id || null, raw };
}

function normalizeSenderIdStatus(raw) {
  const rawStatus = (raw.status || "").toLowerCase();
  let status = "PENDING";
  if (rawStatus.includes("approve") || rawStatus.includes("active")) status = "ACTIVE";
  else if (rawStatus.includes("reject") || rawStatus.includes("denied")) status = "REJECTED";
  return { status, raw };
}

module.exports = { sendSms, requestSenderId, checkSenderIdStatus };
