const catchAsync = require("../../common/utils/catchAsync");
const service = require("./smsWallet.service");

const getWallet = catchAsync(async (req, res) => {
  const wallet = await service.getWallet(req.user.id);
  res.status(200).json({ success: true, data: { credits: wallet.credits.toString() } });
});

const purchaseCredits = catchAsync(async (req, res) => {
  const order = await service.purchaseCredits({
    userId: req.user.id,
    userRole: req.user.role,
    productId: req.body.productId,
  });
  res.status(201).json({ success: true, data: order });
});

module.exports = { getWallet, purchaseCredits };
