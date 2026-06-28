const { body } = require("express-validator");

const sendMessageValidation = [
  body("message")
    .trim()
    .notEmpty()
    .isLength({ max: 2000 })
    .withMessage("Message is required (max 2000 characters)"),
  body("conversationId").optional().isUUID(),
];

module.exports = { sendMessageValidation };
