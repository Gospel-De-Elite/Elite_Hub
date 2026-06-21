const catchAsync = require("../../common/utils/catchAsync");
const service = require("./analytics.service");

const getOverview = catchAsync(async (req, res) => {
  const overview = await service.getOverview();
  res.status(200).json({ success: true, data: overview });
});

module.exports = { getOverview };
