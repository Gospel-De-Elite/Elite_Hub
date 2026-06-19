const axios = require("axios");
const crypto = require("crypto");
const env = require("../../../common/config/env");

const client = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${env.paystack.secretKey}`,
    "Content-Type": "application/json",
  },
});

async function initializeTransaction({ email, amount, reference }) {
  const response = await client.post("/transaction/initialize", {
    email,
    amount: Math.round(Number(amount) * 100), // naira -> kobo
    reference,
  });
  return response.data;
}

async function verifyTransaction(reference) {
  const response = await client.get(`/transaction/verify/${reference}`);
  return response.data;
}

// Paystack signs the raw request body with HMAC-SHA512 using the secret key.
// `rawBody` MUST be the exact byte buffer Paystack sent — re-stringifying
// req.body produces a different string and will always fail verification.
function verifySignature(rawBody, signatureHeader) {
  if (!rawBody || !signatureHeader) return false;

  const hash = crypto
    .createHmac("sha512", env.paystack.secretKey)
    .update(rawBody)
    .digest("hex");

  return hash === signatureHeader;
}

module.exports = { initializeTransaction, verifyTransaction, verifySignature };
