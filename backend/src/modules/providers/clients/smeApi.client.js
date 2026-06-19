const axios = require("axios");
const env = require("../../../common/config/env");

// NOTE: Endpoint paths and response field names below are illustrative,
// based on common Nigerian VTU reseller API conventions. Confirm the exact
// shape against your live SME API account docs once you have real
// credentials, and adjust ENDPOINTS plus the two normalize functions below
// — those are the only places that should need to change.

const client = axios.create({
  baseURL: env.smeApi.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${env.smeApi.apiKey}`,
    "Content-Type": "application/json",
  },
});

const ENDPOINTS = {
  AIRTIME: "/airtime",
  DATA: "/data",
  ELECTRICITY: "/electricity",
  TV: "/cable",
};

async function submitOrder({ orderType, payload, requestReference }) {
  const endpoint = ENDPOINTS[orderType];
  if (!endpoint) throw new Error(`SME API: unsupported order type ${orderType}`);

  const response = await client.post(endpoint, {
    request_id: requestReference,
    ...payload,
  });

  return normalizeSubmitResponse(response.data);
}

async function checkStatus(requestReference) {
  const response = await client.get(`/status/${requestReference}`);
  return normalizeStatusResponse(response.data);
}

function normalizeSubmitResponse(raw) {
  const success = raw.status === "success" || raw.Status === "successful";
  return {
    success,
    providerReference: raw.reference || raw.transactionId || null,
    raw,
  };
}

function normalizeStatusResponse(raw) {
  const rawStatus = (raw.status || raw.Status || "").toLowerCase();
  let status = "UNKNOWN";
  if (rawStatus.includes("success")) status = "SUCCESS";
  else if (rawStatus.includes("fail")) status = "FAILED";
  else if (rawStatus.includes("pending")) status = "PENDING";

  return { status, providerReference: raw.reference || raw.transactionId || null, raw };
}

module.exports = { submitOrder, checkStatus };
