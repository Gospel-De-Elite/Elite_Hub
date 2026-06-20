const express = require("express");
const controller = require("./senderId.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const { submitRequestValidation } = require("./senderId.validation");

const router = express.Router();

router.use(authenticate);

router.post("/", submitRequestValidation, validate, controller.submitRequest);
router.get("/requests", controller.listMyRequests);

module.exports = router;
