const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../config/redis");

// General-purpose limiter applied to every request. Per-role tiered limits
// (Customer 100/min, Reseller 300/min, Agent 500/min) get applied separately
// at the Developer API Platform layer in Phase 8 — this is the public-facing
// floor, not the final word on rate limiting.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:general:",
  }),
  message: { success: false, message: "Too many requests, please try again shortly." },
});

// Tighter limiter for auth endpoints — slows down credential stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:auth:",
  }),
  message: { success: false, message: "Too many attempts, please try again later." },
});

module.exports = { generalLimiter, authLimiter };
