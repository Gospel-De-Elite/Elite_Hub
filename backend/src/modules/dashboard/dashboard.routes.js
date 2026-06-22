const express = require("express");
const controller = require("./dashboard.controller");
const authenticate = require("../../common/middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/summary", controller.getSummary);

module.exports = router;
