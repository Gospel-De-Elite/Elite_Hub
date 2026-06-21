const catchAsync = require("../../common/utils/catchAsync");
const service = require("./esimOrder.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const purchaseEsim = catchAsync(async (req, res) => {
  const order = await service.purchaseEsim({
    userId: req.user.id,
    esimProductId: req.body.esimProductId,
  });
  res.status(201).json({ success: true, data: order });
});

const listOrders = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await service.listOrders(req.user.id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });
  res.status(200).json({ success: true, data: result });
});

const getOrder = catchAsync(async (req, res) => {
  const order = await service.getOrder(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: order });
});

const getQrCode = catchAsync(async (req, res) => {
  const filePath = await service.getQrCodeFile(req.user.id, req.user.role, req.params.id);
  res.sendFile(filePath);
});

const openDispute = catchAsync(async (req, res) => {
  const order = await service.openDispute({
    userId: req.user.id,
    esimOrderId: req.params.id,
    reason: req.body.reason,
  });
  res.status(200).json({ success: true, data: order });
});

const listDisputes = catchAsync(async (req, res) => {
  const disputes = await service.listDisputes();
  res.status(200).json({ success: true, data: disputes });
});

const resolveDispute = catchAsync(async (req, res) => {
  const result = await service.resolveDispute({
    esimOrderId: req.params.id,
    resolution: req.body.resolution,
    adminNotes: req.body.adminNotes,
    reviewer: actorFrom(req),
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  purchaseEsim,
  listOrders,
  getOrder,
  getQrCode,
  openDispute,
  listDisputes,
  resolveDispute,
};
