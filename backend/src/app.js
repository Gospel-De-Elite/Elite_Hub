const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./modules/auth/auth.routes");
const walletRoutes = require("./modules/wallets/wallet.routes");
const webhookRoutes = require("./modules/wallets/webhook.routes");
const orderRoutes = require("./modules/orders/order.routes");
const pricingAdminRoutes = require("./modules/pricing/pricing.routes");
const roleUpgradeRoutes = require("./modules/roleUpgrades/roleUpgrade.routes");
const roleUpgradeAdminRoutes = require("./modules/roleUpgrades/roleUpgrade.admin.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const smsWalletRoutes = require("./modules/sms/smsWallet.routes");
const campaignRoutes = require("./modules/sms/campaign.routes");
const senderIdRoutes = require("./modules/sms/senderId.routes");
const senderIdAdminRoutes = require("./modules/sms/senderId.admin.routes");
const esimRoutes = require("./modules/esim/esim.routes");
const esimAdminRoutes = require("./modules/esim/esim.admin.routes");
const apiKeyRoutes = require("./modules/developer/apiKey.routes");
const publicApiRoutes = require("./modules/publicApi/publicApi.routes");
const userManagementRoutes = require("./modules/admin/userManagement.routes");
const auditLogRoutes = require("./modules/admin/auditLog.routes");
const analyticsRoutes = require("./modules/admin/analytics.routes");
const providerAdminRoutes = require("./modules/providers/providerAdmin.routes");
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
app.use("/api/v1/role-upgrades", roleUpgradeRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/sms/wallet", smsWalletRoutes);
app.use("/api/v1/sms/campaigns", campaignRoutes);
app.use("/api/v1/sms/sender-ids", senderIdRoutes);
app.use("/api/v1/esim", esimRoutes);
app.use("/api/v1/developer/api-keys", apiKeyRoutes);

// Admin surface — note pricing moved from the old bare "/api/v1/admin"
// mount to "/api/v1/admin/pricing" (Phase 9 cleanup): the bare prefix meant
// every request to any newer /api/v1/admin/* route silently passed through
// pricing's auth middleware redundantly first. Harmless, but worth fixing
// now before more admin routes pile up on top of it.
app.use("/api/v1/admin/pricing", pricingAdminRoutes);
app.use("/api/v1/admin/role-upgrades", roleUpgradeAdminRoutes);
app.use("/api/v1/admin/sender-id-requests", senderIdAdminRoutes);
app.use("/api/v1/admin/esim", esimAdminRoutes);
app.use("/api/v1/admin/users", userManagementRoutes);
app.use("/api/v1/admin/audit-logs", auditLogRoutes);
app.use("/api/v1/admin/analytics", analyticsRoutes);
app.use("/api/v1/admin/providers", providerAdminRoutes);

// The public Developer API surface — API-key authenticated, not JWT.
// Deliberately a separate prefix from everything above: a stable,
// versioned contract third parties depend on, distinct from the
// dashboard's internal endpoints which can evolve freely.
app.use("/api/v1/public", publicApiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
