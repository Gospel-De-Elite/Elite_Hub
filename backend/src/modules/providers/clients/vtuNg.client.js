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

/**
 * Fetch VTU.ng's live product catalog.
 * Same normalized shape as smeApi.client.js — adjust normalizeProduct()
 * to match VTU.ng's actual response format once you have live docs.
 */
async function fetchCatalog() {
  const response = await client.get("/products");
  const raw = response.data?.products || response.data?.data || [];
  return raw.map(normalizeProduct).filter(Boolean);
}

function normalizeProduct(raw) {
  if (!raw.code && !raw.product_code) return null;
  return {
    code:     raw.code     || raw.product_code,
    name:     raw.name     || raw.product_name || raw.description,
    cost:     Number(raw.cost || raw.price || raw.amount || 0),
    category: normalizeCategorySlug(raw.category || raw.type || ""),
    network:  raw.network  || raw.operator || null,
  };
}

function normalizeCategorySlug(raw) {
  const r = (raw || "").toLowerCase();
  if (r.includes("airtime") || r.includes("topup"))   return "airtime";
  if (r.includes("data")    || r.includes("bundle"))  return "data";
  if (r.includes("electric") || r.includes("disco"))  return "electricity";
  if (r.includes("tv")      || r.includes("cable"))   return "tv";
  return r;
}

module.exports = { submitOrder, checkStatus, fetchCatalog };
