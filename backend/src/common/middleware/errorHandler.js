const ApiError = require("../errors/ApiError");
const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize any non-ApiError (Prisma errors, unexpected throws, etc.)
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal server error";
    error = new ApiError(statusCode, message, false);
  }

  if (!error.isOperational) {
    logger.error(`${req.method} ${req.originalUrl} — ${err.stack || err.message}`);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
