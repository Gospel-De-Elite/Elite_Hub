const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../config/redis");

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

const supportChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    return `ip:${ip.replace(/^::ffff:/, "")}`;
  },
  skip: (req) => !!req.user?.id,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: "rl:support:",
  }),
  message: { success: false, message: "You're sending messages too quickly. Please slow down." },
});

module.exports = { generalLimiter, authLimiter, supportChatLimiter };
