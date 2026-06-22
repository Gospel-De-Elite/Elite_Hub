const catchAsync = require("../../common/utils/catchAsync");
const service = require("./dashboard.service");

const getSummary = catchAsync(async (req, res) => {
  const summary = await service.getSummary(req.user.id);
  res.status(200).json({ success: true, data: summary });
});

module.exports = { getSummary };
