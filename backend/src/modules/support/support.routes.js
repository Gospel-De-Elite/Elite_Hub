const express = require("express");
const controller = require("./support.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const { supportChatLimiter } = require("../../common/middleware/rateLimiter");
const { sendMessageValidation } = require("./support.validation");

const router = express.Router();

router.use(authenticate);

router.post("/chat/message", supportChatLimiter, sendMessageValidation, validate, controller.sendMessage);
router.get("/chat/conversation", controller.getConversation);

module.exports = router;
