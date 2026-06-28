const catchAsync = require("../../common/utils/catchAsync");
const service = require("./aiSupport.service");

const sendMessage = catchAsync(async (req, res) => {
  const result = await service.sendMessage({
    userId: req.user.id,
    userRole: req.user.role,
    conversationId: req.body.conversationId,
    message: req.body.message,
  });
  res.status(200).json({ success: true, data: result });
});

const getConversation = catchAsync(async (req, res) => {
  const conversation = await service.getCurrentConversationWithMessages(req.user.id);
  res.status(200).json({ success: true, data: conversation });
});

module.exports = { sendMessage, getConversation };
