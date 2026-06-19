const env = require("./common/config/env");
const app = require("./app");
const prisma = require("./common/config/prisma");
const logger = require("./common/utils/logger");
require("./queues"); // initializes all BullMQ queue connections on boot

const server = app.listen(env.port, () => {
  logger.info(`Elite Hub API listening on port ${env.port} [${env.nodeEnv}]`);
});

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed, DB connections released");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
