const catchAsync = require("../../common/utils/catchAsync");
const paystackClient = require("./providers/paystack.client");
const monnifyClient = require("./providers/monnify.client");
const { webhookQueue } = require("../../queues");
const logger = require("../../common/utils/logger");

// Signature verification happens here, synchronously, before the gateway
// gets an ack — actual crediting is pushed to the webhook queue and
// processed by the worker, so a slow DB write never delays the response
// the gateway is waiting on.

const paystackWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const isValid = paystackClient.verifySignature(req.rawBody, signature);

  if (!isValid) {
    logger.error("Paystack webhook signature verification failed");
    return res.status(401).json({ received: false });
  }

  await webhookQueue.add("paystack-event", req.body);
  res.status(200).json({ received: true });
});

const monnifyWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["monnify-signature"];
  const isValid = monnifyClient.verifySignature(req.rawBody, signature);

  if (!isValid) {
    logger.error("Monnify webhook signature verification failed");
    return res.status(401).json({ received: false });
  }

  await webhookQueue.add("monnify-event", req.body);
  res.status(200).json({ received: true });
});

module.exports = { paystackWebhook, monnifyWebhook };
