const catchAsync = require("../../common/utils/catchAsync");
const authService = require("./auth.service");

function getMeta(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body, getMeta(req));
  res.status(201).json({ success: true, data: result });
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body, getMeta(req));
  res.status(200).json({ success: true, data: result });
});

const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, getMeta(req));
  res.status(200).json({ success: true, data: result });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

const logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.status(200).json({ success: true, message: "Logged out from all devices" });
});

module.exports = { register, login, refresh, logout, logoutAll };
