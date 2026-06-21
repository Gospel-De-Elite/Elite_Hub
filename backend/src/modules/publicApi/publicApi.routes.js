const express = require("express");
const { body } = require("express-validator");
const authenticateApiKey = require("./authenticateApiKey");
const apiUsageLogger = require("./apiUsageLogger");
const apiKeyRateLimiter = require("./apiRateLimiter");
const validate = require("../../common/middleware/validate");
const catchAsync = require("../../common/utils/catchAsync");

const orderService = require("../orders/order.service");
const smsCampaignService = require("../sms/campaign.service");
const esimOrderService = require("../esim/esimOrder.service");
const webhookDeliveryService = require("./webhookDelivery.service");

const {
  airtimeValidation,
  dataValidation,
  electricityValidation,
  tvValidation,
} = require("../orders/order.validation");

const router = express.Router();

// Order matters: auth resolves req.user/req.apiKeyId, the logger needs
// those already set, and the rate limiter needs req.user.role to pick the
// right tier — none of these can be reordered.
router.use(authenticateApiKey, apiUsageLogger, apiKeyRateLimiter);

// Builds a route handler for one VTU order type — reuses the exact same
// order.service.js the dashboard uses, so there is exactly one place
// purchase logic, pricing snapshots, and the wallet lock lifecycle live.
function buy(orderType, validation) {
  return [
    validation,
    validate,
    catchAsync(async (req, res) => {
      const { productId, ...details } = req.body;
      const order = await orderService.createOrder({
        userId: req.user.id,
        userRole: req.user.role,
        orderType,
        productId,
        details,
      });

      // Fire-and-forget — webhook delivery must never delay or fail the API response.
      webhookDeliveryService
        .deliverOrderWebhook(req.apiKeyId, { event: `order.${order.status.toLowerCase()}`, order })
        .catch(() => {});

      res.status(201).json({ success: true, data: order });
    }),
  ];
}

router.post("/airtime", ...buy("AIRTIME", airtimeValidation));
router.post("/data", ...buy("DATA", dataValidation));
router.post("/electricity", ...buy("ELECTRICITY", electricityValidation));
router.post("/tv", ...buy("TV", tvValidation));

router.get(
  "/orders/:reference",
  catchAsync(async (req, res) => {
    const order = await orderService.getOrderByReference(req.user.id, req.params.reference);
    res.status(200).json({ success: true, data: order });
  })
);

// Single transactional send — distinct from the dashboard's bulk campaign
// system. A developer calling this API expects a prompt, definitive
// success/fail answer (e.g. an OTP flow), so this calls Termii synchronously
// rather than queuing it like dashboard campaigns do.
router.post(
  "/sms/send",
  [
    body("recipient")
      .matches(/^(\+234|0)[789][01]\d{8}$/)
      .withMessage("A valid Nigerian phone number is required"),
    body("message").trim().notEmpty().isLength({ max: 480 }),
  ],
  validate,
  catchAsync(async (req, res) => {
    const result = await smsCampaignService.sendSingleSms({
      userId: req.user.id,
      recipient: req.body.recipient,
      message: req.body.message,
    });
    res.status(200).json({ success: true, data: result });
  })
);

router.post(
  "/esim/orders",
  [body("esimProductId").isUUID().withMessage("A valid esimProductId is required")],
  validate,
  catchAsync(async (req, res) => {
    const order = await esimOrderService.purchaseEsim({
      userId: req.user.id,
      esimProductId: req.body.esimProductId,
    });

    webhookDeliveryService
      .deliverOrderWebhook(req.apiKeyId, { event: `esim_order.${order.status.toLowerCase()}`, order })
      .catch(() => {});

    res.status(201).json({ success: true, data: order });
  })
);

module.exports = router;
