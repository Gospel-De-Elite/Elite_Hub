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
};
