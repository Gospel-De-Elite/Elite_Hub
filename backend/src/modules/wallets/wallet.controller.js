const catchAsync = require("../../common/utils/catchAsync");
const walletService = require("./wallet.service");

const getWallet = catchAsync(async (req, res) => {
  const wallet = await walletService.getWallet(req.user.id);
  res.status(200).json({ success: true, data: wallet });
});

const getTransactions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const result = await walletService.getTransactionHistory(req.user.id, { page, limit });
  res.status(200).json({ success: true, data: result });
});

module.exports = { getWallet, getTransactions };
