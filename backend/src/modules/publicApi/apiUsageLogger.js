const prisma = require("../../common/config/prisma");
const logger = require("../../common/utils/logger");

// Registered after authenticateApiKey, before the rate limiter — this way
// even a 429 (rate-limited) request still gets logged, since res.on("finish")
// fires regardless of where in the chain the response was actually sent.
function apiUsageLogger(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    prisma.apiUsageLog
      .create({
        data: {
          apiKeyId: req.apiKeyId,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          ipAddress: req.ip,
        },
      })
      .catch((error) => logger.error(`Failed to write api_usage_log: ${error.message}`));
  });

  next();
}

module.exports = apiUsageLogger;
