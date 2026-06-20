const catchAsync = require("../../common/utils/catchAsync");
const service = require("./roleUpgrade.service");

function reviewerFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const submitRequest = catchAsync(async (req, res) => {
  const request = await service.submitRequest({
    userId: req.user.id,
    currentRole: req.user.role,
    requestedRole: req.body.requestedRole,
    reason: req.body.reason,
  });
  res.status(201).json({ success: true, data: request });
});

const listMyRequests = catchAsync(async (req, res) => {
  const requests = await service.listMyRequests(req.user.id);
  res.status(200).json({ success: true, data: requests });
});

const listPendingRequests = catchAsync(async (req, res) => {
  const requests = await service.listPendingRequests();
  res.status(200).json({ success: true, data: requests });
});

const reviewRequest = catchAsync(async (req, res) => {
  const result = await service.reviewRequest({
    requestId: req.params.id,
    action: req.body.action,
    rejectionReason: req.body.rejectionReason,
    reviewer: reviewerFrom(req),
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = { submitRequest, listMyRequests, listPendingRequests, reviewRequest };
