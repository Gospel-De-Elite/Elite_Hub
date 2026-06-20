const express = require("express");
const controller = require("./catalog.controller");
const authenticate = require("../../common/middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/products", controller.listProducts);

module.exports = router;
