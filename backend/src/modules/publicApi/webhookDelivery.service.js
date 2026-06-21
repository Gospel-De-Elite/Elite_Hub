const axios = require("axios");
const prisma = require("../../common/config/prisma");
const logger = require("../../common/utils/logger");

/**
 * Future-facing hook, per the roadmap — this delivers a single best-effort
 * POST with no retry queue, no backoff, and no payload signing yet. A
 * proper hardening pass (HMAC signing using a dedicated webhook secret,
 * retry/backoff via a queue, a delivery log table) is a deliberate later
 * task, not an oversight here — this just lays the foundation so resellers
 * can start registering URLs and receiving order events today.
 */
async function deliverOrderWebhook(apiKeyId, payload) {
  if (!apiKeyId) return;

  const apiKeyRecord = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKeyRecord?.webhookUrl) return;

  try {
    await axios.post(apiKeyRecord.webhookUrl, payload, { timeout: 5000 });
  } catch (error) {
    logger.error(`Webhook delivery to ${apiKeyRecord.webhookUrl} failed: ${error.message}`);
  }
}

module.exports = { deliverOrderWebhook };
