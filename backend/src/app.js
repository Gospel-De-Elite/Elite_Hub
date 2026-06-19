const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./modules/auth/auth.routes");
const walletRoutes = require("./modules/wallets/wallet.routes");
const webhookRoutes = require("./modules/wallets/webhook.routes");
const orderRoutes = require("./modules/orders/order.routes");
const { generalLimiter } = require("./common/middleware/rateLimiter");
const notFound = require("./common/middleware/notFound");
const errorHandler = require("./common/middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());

// `verify` captures the raw request body buffer alongside JSON parsing —
// required for HMAC signature verification on incoming gateway webhooks,
// which must be computed over the exact bytes sent, not a re-stringified
// copy of req.body (a frequent source of signature-mismatch bugs).
app.use(
  express.json({
    limit: "10kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Required for correct req.ip once this sits behind Nginx/Cloudflare in production
app.set("trust proxy", 1);

app.use(generalLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Elite Hub API is running" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/orders", orderRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
