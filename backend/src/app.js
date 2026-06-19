const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./modules/auth/auth.routes");
const { generalLimiter } = require("./common/middleware/rateLimiter");
const notFound = require("./common/middleware/notFound");
const errorHandler = require("./common/middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Required for correct req.ip once this sits behind Nginx/Cloudflare in production
app.set("trust proxy", 1);

app.use(generalLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Elite Hub API is running" });
});

app.use("/api/v1/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
