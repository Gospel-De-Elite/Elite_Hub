const catchAsync = require("../../common/utils/catchAsync");
const service = require("./senderId.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const submitRequest = catchAsync(async (req, res) => {
  const request = await service.submitRequest({
    userId: req.user.id,
    requestedSenderId: req.body.requestedSenderId,
  });
  res.status(201).json({ success: true, data: request });
});

const listMyRequests = catchAsync(async (req, res) => {
  const requests = await service.listMyRequests(req.user.id);
  res.status(200).json({ success: true, data: requests });
});

const listAllRequests = catchAsync(async (req, res) => {
  const requests = await service.listAllRequests({ status: req.query.status });
  res.status(200).json({ success: true, data: requests });
});

const review = catchAsync(async (req, res) => {
  const result = await service.review({
    requestId: req.params.id,
    action: req.body.action,
    rejectionReason: req.body.rejectionReason,
    reviewer: actorFrom(req),
  });
  res.status(200).json({ success: true, data: result });
});

const submitToCarrier = catchAsync(async (req, res) => {
  const result = await service.submitToCarrier(req.params.id);
  res.status(200).json({ success: true, data: result });
});

const recordCarrierDecision = catchAsync(async (req, res) => {
  const result = await service.recordCarrierDecision({
    requestId: req.params.id,
    status: req.body.status,
    carrierRejectionReason: req.body.carrierRejectionReason,
    reviewer: actorFrom(req),
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  submitRequest,
  listMyRequests,
  listAllRequests,
  review,
  submitToCarrier,
  recordCarrierDecision,
};
