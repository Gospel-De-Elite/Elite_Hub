// Wraps async route handlers so rejected promises reach the global error
// handler instead of crashing the process or hanging the request.
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
