require("dotenv").config();

const required = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "REDIS_URL",
  "PAYSTACK_SECRET_KEY",
  "MONNIFY_API_KEY",
  "MONNIFY_SECRET_KEY",
  "MONNIFY_CONTRACT_CODE",
  "SME_API_KEY",
  "SME_API_BASE_URL",
  "VTUNG_API_KEY",
  "VTUNG_BASE_URL",
  "TERMII_API_KEY",
  "AIRALO_CLIENT_ID",
  "AIRALO_CLIENT_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,
  appUrl: process.env.APP_URL || "http://localhost:5000",
  // Where gateway hosted-payment pages redirect the user BACK to — this is
  // the frontend SPA, never the backend API, since the backend has no UI
  // to show them. Defaults to the local Vite dev server port.
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  redisUrl: process.env.REDIS_URL,

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  },

  monnify: {
    apiKey: process.env.MONNIFY_API_KEY,
    secretKey: process.env.MONNIFY_SECRET_KEY,
    contractCode: process.env.MONNIFY_CONTRACT_CODE,
    baseUrl: process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com",
  },

  smeApi: {
    apiKey: process.env.SME_API_KEY,
    baseUrl: process.env.SME_API_BASE_URL,
  },

  vtuNg: {
    apiKey: process.env.VTUNG_API_KEY,
    baseUrl: process.env.VTUNG_BASE_URL,
  },

  termii: {
    apiKey: process.env.TERMII_API_KEY,
    baseUrl: process.env.TERMII_BASE_URL || "https://api.ng.termii.com",
  },

  airalo: {
    clientId: process.env.AIRALO_CLIENT_ID,
    clientSecret: process.env.AIRALO_CLIENT_SECRET,
    baseUrl: process.env.AIRALO_BASE_URL || "https://sandbox-partners-api.airalo.com",
  },
};
