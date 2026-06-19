const Redis = require("ioredis");
const env = require("../common/config/env");
const logger = require("../common/utils/logger");

// BullMQ requires its own connection with maxRetriesPerRequest: null —
// this is intentionally separate from the general-purpose cache/rate-limit
// Redis client in common/config/redis.js.
const bullConnection = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

bullConnection.on("connect", () => logger.info("BullMQ Redis connection established"));
bullConnection.on("error", (err) => logger.error(`BullMQ Redis error: ${err.message}`));

module.exports = bullConnection;
