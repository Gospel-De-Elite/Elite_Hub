const axios = require("axios");
const env = require("../../../common/config/env");
const redisClient = require("../../../common/config/redis");

const TOKEN_CACHE_KEY = "airalo:access_token";
const TOKEN_TTL_SECONDS = 50 * 60;

// NOTE: Airalo's Partner API shape below follows their commonly documented
// v2 REST conventions (OAuth2 client_credentials + /v2/orders). Confirm
// against your live Airalo partner docs once you have real credentials —
// in particular, exactly how the QR code is returned (hosted image URL,
// base64, or LPA-only) varies, and determines which qrSource.type ends up
// used in normalizeOrderResponse below.

async function getAccessToken() {
  const cached = await redisClient.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const response = await axios.post(`${env.airalo.baseUrl}/v2/token`, {
    client_id: env.airalo.clientId,
    client_secret: env.airalo.clientSecret,
    grant_type: "client_credentials",
  });

  const token = response.data.data.access_token;
  await redisClient.set(TOKEN_CACHE_KEY, token, "EX", TOKEN_TTL_SECONDS);

  return token;
}

async function placeOrder({ packageId, quantity, reference }) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${env.airalo.baseUrl}/v2/orders`,
    { package_id: packageId, quantity, description: reference },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
  );

  return normalizeOrderResponse(response.data);
}

async function checkOrderStatus(providerOrderId) {
  const token = await getAccessToken();

  const response = await axios.get(`${env.airalo.baseUrl}/v2/orders/${providerOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return normalizeOrderResponse(response.data);
}

function normalizeOrderResponse(raw) {
  const data = raw.data || raw;
  const sim = data.sims?.[0] || {};

  let qrSource = null;
  if (sim.qrcode_url) {
    qrSource = { type: "url", value: sim.qrcode_url };
  } else if (sim.qrcode) {
    qrSource = { type: "base64", value: sim.qrcode };
  } else if (sim.lpa) {
    qrSource = { type: "lpa", value: sim.lpa };
  }

  return {
    providerOrderId: data.id || null,
    iccid: sim.iccid || null,
    qrSource,
    raw: data,
  };
}

module.exports = { placeOrder, checkOrderStatus, getAccessToken };
