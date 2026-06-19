const axios = require("axios");
const env = require("../../../common/config/env");

// NOTE: Same caveat as smeApi.client.js — endpoint paths and field names
// here are illustrative. This is the failover provider, only ever reached
// when SME API is unhealthy or has confirmed-failed a transaction, so
// confirm these against VTU.ng's actual docs before relying on it live.

const client = axios.create({
  baseURL: env.vtuNg.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${env.vtuNg.apiKey}`,
    "Content-Type": "application/json",
  },
});

const ENDPOINTS = {
  AIRTIME: "/topup",
  DATA: "/data",
  ELECTRICITY: "/billpayment/electricity",
  TV: "/billpayment/tv",
};

async function submitOrder({ orderType, payload, requestReference }) {
  const endpoint = ENDPOINTS[orderType];
  if (!endpoint) throw new Error(`VTU.ng: unsupported order type ${orderType}`);

  const response = await client.post(endpoint, {
    request_id: requestReference,
    ...payload,
  });

  return normalizeSubmitResponse(response.data);
}

async function checkStatus(requestReference) {
  const response = await client.get(`/requery/${requestReference}`);
  return normalizeStatusResponse(response.data);
}

function normalizeSubmitResponse(raw) {
  const success = raw.status === "success" || raw.code === "000";
  return {
    success,
    providerReference: raw.reference || raw.order_id || null,
    raw,
  };
}

function normalizeStatusResponse(raw) {
  const rawStatus = (raw.status || "").toLowerCase();
  let status = "UNKNOWN";
  if (rawStatus.includes("success")) status = "SUCCESS";
  else if (rawStatus.includes("fail")) status = "FAILED";
  else if (rawStatus.includes("pending")) status = "PENDING";

  return { status, providerReference: raw.reference || raw.order_id || null, raw };
}

module.exports = { submitOrder, checkStatus };
