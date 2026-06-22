const axios = require("axios");
const crypto = require("crypto");
const env = require("../../../common/config/env");
const redisClient = require("../../../common/config/redis");

const TOKEN_CACHE_KEY = "monnify:access_token";
const TOKEN_TTL_SECONDS = 50 * 60; // Monnify tokens last ~1hr — cache slightly under that

async function getAccessToken() {
  const cached = await redisClient.get(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const credentials = Buffer.from(`${env.monnify.apiKey}:${env.monnify.secretKey}`).toString(
    "base64"
  );

  const response = await axios.post(
    `${env.monnify.baseUrl}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  const token = response.data.responseBody.accessToken;
  await redisClient.set(TOKEN_CACHE_KEY, token, "EX", TOKEN_TTL_SECONDS);

  return token;
}

async function initializeTransaction({ amount, customerName, customerEmail, paymentReference }) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${env.monnify.baseUrl}/api/v1/merchant/transactions/init-transaction`,
    {
      amount,
      customerName,
      customerEmail,
      paymentReference,
      paymentDescription: "Elite Hub wallet funding",
      currencyCode: "NGN",
      contractCode: env.monnify.contractCode,
      // FIX: this was pointing at env.appUrl (the backend, port 5000) —
      // the backend serves no UI, so a real payment would have redirected
      // the user to a dead end. Monnify appends ?paymentReference=...
      // automatically, matching the reference we generated.
      redirectUrl: `${env.frontendUrl}/dashboard/wallet/callback`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

async function queryTransaction(paymentReference) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${env.monnify.baseUrl}/api/v1/merchant/transactions/query?paymentReference=${paymentReference}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// NOTE: This implements Monnify's documented SHA512(rawBody + clientSecret)
// webhook signature scheme. Gateway signature schemes occasionally get
// revised — confirm this against your live Monnify merchant dashboard docs
// before going live, and double check by logging real sandbox webhook
// headers during testing.
function verifySignature(rawBody, signatureHeader) {
  if (!rawBody || !signatureHeader) return false;

  const hash = crypto
    .createHash("sha512")
    .update(rawBody + env.monnify.secretKey)
    .digest("hex");

  return hash === signatureHeader;
}

module.exports = { getAccessToken, initializeTransaction, queryTransaction, verifySignature };
