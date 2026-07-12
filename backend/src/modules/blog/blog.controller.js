"use strict";

const catchAsync  = require("../../common/utils/catchAsync");
const blogService = require("./blog.service");

// ─── Public ───────────────────────────────────────────────────────────────────

const listPublished = catchAsync(async (req, res) => {
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const result = await blogService.listPublished({ page, limit });
  res.status(200).json({ success: true, data: result });
});

const getBySlug = catchAsync(async (req, res) => {
  const post = await blogService.getPublishedBySlug(req.params.slug);
  res.status(200).json({ success: true, data: post });
});

const previewSlug = catchAsync(async (req, res) => {
  const slug = blogService.previewSlug(req.query.title || "");
  res.status(200).json({ success: true, data: { slug } });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

const listAll = catchAsync(async (req, res) => {
  const page   = parseInt(req.query.page,  10) || 1;
  const limit  = parseInt(req.query.limit, 10) || 20;
  const status = req.query.status || undefined;
  const result = await blogService.listAll({ page, limit, status });
  res.status(200).json({ success: true, data: result });
});

const getById = catchAsync(async (req, res) => {
  const post = await blogService.getById(req.params.id);
  res.status(200).json({ success: true, data: post });
});

const create = catchAsync(async (req, res) => {
  const post = await blogService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data: post });
});

const update = catchAsync(async (req, res) => {
  const post = await blogService.update(req.params.id, req.body, req.user.id);
  res.status(200).json({ success: true, data: post });
});

const publish = catchAsync(async (req, res) => {
  const post = await blogService.publish(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: post });
});

const unpublish = catchAsync(async (req, res) => {
  const post = await blogService.unpublish(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: post });
});

const remove = catchAsync(async (req, res) => {
  const result = await blogService.remove(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  listPublished,
  getBySlug,
  previewSlug,
  listAll,
  getById,
  create,
  update,
  publish,
  unpublish,
  remove,
};
