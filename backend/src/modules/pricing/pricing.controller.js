const catchAsync = require("../../common/utils/catchAsync");
const pricingService = require("./pricing.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const listProducts = catchAsync(async (req, res) => {
  const products = await pricingService.listProducts({ categorySlug: req.query.category });
  res.status(200).json({ success: true, data: products });
});

const getProduct = catchAsync(async (req, res) => {
  const product = await pricingService.getProduct(req.params.id);
  res.status(200).json({ success: true, data: product });
});

const createProduct = catchAsync(async (req, res) => {
  const product = await pricingService.createProduct(req.body, actorFrom(req));
  res.status(201).json({ success: true, data: product });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await pricingService.updateProduct(req.params.id, req.body, actorFrom(req));
  res.status(200).json({ success: true, data: product });
});

const upsertPricing = catchAsync(async (req, res) => {
  const result = await pricingService.upsertPricing(req.params.id, req.body, actorFrom(req));
  res.status(200).json({ success: true, data: result });
});

const listCategories = catchAsync(async (req, res) => {
  const categories = await pricingService.listCategories();
  res.status(200).json({ success: true, data: categories });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  upsertPricing,
  listCategories,
};
