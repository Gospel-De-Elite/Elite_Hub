const catchAsync = require("../../common/utils/catchAsync");
const service = require("./notification.service");

const listNotifications = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await service.listNotifications(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });
  res.status(200).json({ success: true, data: result });
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await service.markAsRead(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: notification });
});

module.exports = { listNotifications, markAsRead };
