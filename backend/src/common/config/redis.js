const Redis = require("ioredis");
const env = require("./env");
const logger = require("../utils/logger");

// Shared Redis client — used for caching, sessions, rate limiting, OTP storage.
// BullMQ uses its own dedicated connection (see queues/connection.js) because
// it requires maxRetriesPerRequest: null, which this general-purpose client does not.
const redisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
});

redisClient.on("connect", () => logger.info("Redis connected"));
redisClient.on("error", (err) => logger.error(`Redis connection error: ${err.message}`));

module.exports = redisClient;
