const catchAsync = require("../../common/utils/catchAsync");
const service = require("./supportAdmin.service");

const listEscalated = catchAsync(async (req, res) => {
  const conversations = await service.listEscalated();
  res.status(200).json({ success: true, data: conversations });
});

const getConversation = catchAsync(async (req, res) => {
  const conversation = await service.getConversation(req.params.id);
  res.status(200).json({ success: true, data: conversation });
});

const markResolved = catchAsync(async (req, res) => {
  const conversation = await service.markResolved(req.params.id);
  res.status(200).json({ success: true, data: conversation });
});

module.exports = { listEscalated, getConversation, markResolved };
