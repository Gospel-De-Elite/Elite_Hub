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

/**
 * Fetch the provider's live product catalog.
 * Returns an array of normalized product objects.
 *
 * NOTE: The endpoint path and response shape below are illustrative.
 * Confirm against your live SME API docs and adjust normalizeProduct()
 * — that is the only function that needs to change.
 *
 * Expected normalized shape:
 * {
 *   code:     string   — unique product code matching our Product.code
 *   name:     string   — display name
 *   cost:     number   — provider's current cost price (Naira, not kobo)
 *   category: string   — "airtime" | "data" | "electricity" | "tv"
 *   network:  string?  — "MTN" | "AIRTEL" | "GLO" | "9MOBILE" | null
 * }
 */
async function fetchCatalog() {
  const response = await client.get("/products");
  const raw = response.data?.products || response.data?.data || [];
  return raw.map(normalizeProduct).filter(Boolean);
}

function normalizeProduct(raw) {
  // Adjust field names here once you have live API docs
  if (!raw.code && !raw.product_code) return null;
  return {
    code:     raw.code     || raw.product_code,
    name:     raw.name     || raw.product_name || raw.description,
    cost:     Number(raw.cost || raw.price || raw.amount || 0),
    category: normalizeCategorySlug(raw.category || raw.type || ""),
    network:  raw.network  || raw.provider || null,
  };
}

function normalizeCategorySlug(raw) {
  const r = (raw || "").toLowerCase();
  if (r.includes("airtime") || r.includes("topup"))      return "airtime";
  if (r.includes("data")    || r.includes("bundle"))     return "data";
  if (r.includes("electric") || r.includes("disco"))     return "electricity";
  if (r.includes("tv")      || r.includes("cable"))      return "tv";
  return r;
}

module.exports = { submitOrder, checkStatus, fetchCatalog };
