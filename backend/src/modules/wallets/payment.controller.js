const catchAsync = require("../../common/utils/catchAsync");
const paymentService = require("./payment.service");

const initialize = catchAsync(async (req, res) => {
  const { amount, gateway } = req.body;
  const result = await paymentService.initializeFunding({
    userId: req.user.id,
    amount,
    gateway,
  });
  res.status(200).json({ success: true, data: result });
});

const verify = catchAsync(async (req, res) => {
  const result = await paymentService.verifyFunding({ reference: req.params.reference });
  res.status(200).json({ success: true, data: result });
});

module.exports = { initialize, verify };
