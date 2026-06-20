const catchAsync = require("../../common/utils/catchAsync");
const service = require("./catalog.service");

const listProducts = catchAsync(async (req, res) => {
  const products = await service.listProductsForRole(req.user.role, { categorySlug: req.query.category });
  res.status(200).json({ success: true, data: products });
});

module.exports = { listProducts };
