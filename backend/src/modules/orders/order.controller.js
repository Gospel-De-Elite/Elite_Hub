const catchAsync = require("../../common/utils/catchAsync");
const orderService = require("./order.service");

function buy(orderType) {
  return catchAsync(async (req, res) => {
    const { productId, ...details } = req.body;
    const order = await orderService.createOrder({
      userId: req.user.id,
      userRole: req.user.role,
      orderType,
      productId,
      details,
    });
    res.status(201).json({ success: true, data: order });
  });
}

const buyAirtime = buy("AIRTIME");
const buyData = buy("DATA");
const buyElectricity = buy("ELECTRICITY");
const buyTv = buy("TV");

const listOrders = catchAsync(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await orderService.listOrders(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    status,
  });
  res.status(200).json({ success: true, data: result });
});

const getOrder = catchAsync(async (req, res) => {
  const order = await orderService.getOrder(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: order });
});

module.exports = { buyAirtime, buyData, buyElectricity, buyTv, listOrders, getOrder };
