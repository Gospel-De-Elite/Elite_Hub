const express = require("express");
const controller = require("./campaign.controller");
const authenticate = require("../../common/middleware/authenticate");
const validate = require("../../common/middleware/validate");
const { createCampaignValidation, campaignIdValidation } = require("./campaign.validation");

const router = express.Router();

router.use(authenticate);

router.post("/", createCampaignValidation, validate, controller.createCampaign);
router.get("/", controller.listCampaigns);
router.get("/:id", campaignIdValidation, validate, controller.getCampaign);
router.post("/:id/cancel", campaignIdValidation, validate, controller.cancelCampaign);

module.exports = router;
