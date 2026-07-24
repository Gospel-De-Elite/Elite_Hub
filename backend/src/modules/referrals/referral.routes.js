const express = require("express");
const controller = require("./referral.controller");
const authenticate = require("../../common/middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.getReferralStats);

module.exports = router;
