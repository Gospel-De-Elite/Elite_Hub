const catchAsync = require("../../common/utils/catchAsync");
const service = require("./esimCatalog.service");

function actorFrom(req) {
  return { id: req.user.id, ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const listProducts = catchAsync(async (req, res) => {
  const products = await service.listProducts({ countryCode: req.query.countryCode });
  res.status(200).json({ success: true, data: products });
});

const listAllProducts = catchAsync(async (req, res) => {
  const products = await service.listProducts({
    countryCode: req.query.countryCode,
    activeOnly: false,
  });
  res.status(200).json({ success: true, data: products });
});

const createProduct = catchAsync(async (req, res) => {
  const product = await service.createProduct(req.body, actorFrom(req));
  res.status(201).json({ success: true, data: product });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await service.updateProduct(req.params.id, req.body, actorFrom(req));
  res.status(200).json({ success: true, data: product });
});

module.exports = { listProducts, listAllProducts, createProduct, updateProduct };
