const express = require("express");
const controller = require("./roleUpgrade.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const { submitRequestValidation } = require("./roleUpgrade.validation");

const router = express.Router();

router.use(authenticate);

router.post("/", submitRequestValidation, validate, controller.submitRequest);
router.get("/me", controller.listMyRequests);

module.exports = router;
