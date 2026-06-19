const ApiError = require("../errors/ApiError");

// Usage: router.get("/admin/x", authenticate, authorize("ADMIN", "SUPER_ADMIN"), handler)
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden("You do not have permission to perform this action"));
  }

  next();
};

module.exports = authorize;
