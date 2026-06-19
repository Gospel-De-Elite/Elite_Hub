const { validationResult } = require("express-validator");
const ApiError = require("../errors/ApiError");

// Runs after express-validator chains; collects all field errors into
// a single, consistently-shaped ApiError response.
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(ApiError.badRequest("Validation failed", details));
  }

  next();
}

module.exports = validate;
