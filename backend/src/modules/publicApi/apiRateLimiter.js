const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../../common/config/redis");

// Per the SRS rate-limit table. Keyed by API key, not IP — one integrator
// could legitimately call from many different IPs (their own server fleet),
// and the limit should travel with the credential, not the network address.
const ROLE_LIMITS = {
  CUSTOMER: 100,
  RESELLER: 300,
  AGENT: 500,
  ADMIN: 1000,
  SUPER_ADMIN: 1000,
};

const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => ROLE_LIMITS[req.user?.role] || ROLE_LIMITS.CUSTOMER,
  keyGenerator: (req) => req.apiKeyId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:apikey:",
  }),
  message: { success: false, message: "Rate limit exceeded for your account tier." },
});

module.exports = apiKeyRateLimiter;
