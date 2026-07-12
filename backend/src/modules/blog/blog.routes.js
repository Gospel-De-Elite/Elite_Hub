"use strict";

const express      = require("express");
const controller   = require("./blog.controller");
const validate     = require("../../common/middleware/validate");
const authenticate = require("../../common/middleware/authenticate");
const authorize    = require("../../common/middleware/authorize");
const {
  createValidation,
  updateValidation,
  idParamValidation,
} = require("./blog.validation");

const router = express.Router();

// ─── Public routes — no auth required ────────────────────────────────────────
// GET /api/v1/blog/posts              — paginated list of published posts
// GET /api/v1/blog/posts/:slug        — single published post by slug
// GET /api/v1/blog/slug-preview       — preview what a slug would look like

router.get("/posts",              controller.listPublished);
router.get("/posts/:slug",        controller.getBySlug);
router.get("/slug-preview",       controller.previewSlug);

// ─── Admin routes — ADMIN or SUPER_ADMIN only ─────────────────────────────────
// GET    /api/v1/blog/admin/posts           — all posts (incl. drafts)
// GET    /api/v1/blog/admin/posts/:id       — single post by UUID
// POST   /api/v1/blog/admin/posts           — create draft
// PATCH  /api/v1/blog/admin/posts/:id       — update fields
// PATCH  /api/v1/blog/admin/posts/:id/publish   — publish
// PATCH  /api/v1/blog/admin/posts/:id/unpublish — revert to draft
// DELETE /api/v1/blog/admin/posts/:id       — delete (DRAFT only)

const adminGuard = [authenticate, authorize("ADMIN", "SUPER_ADMIN")];

router.get(   "/admin/posts",                  ...adminGuard,                                   controller.listAll);
router.get(   "/admin/posts/:id",              ...adminGuard, idParamValidation, validate,      controller.getById);
router.post(  "/admin/posts",                  ...adminGuard, createValidation,  validate,      controller.create);
router.patch( "/admin/posts/:id",              ...adminGuard, updateValidation,  validate,      controller.update);
router.patch( "/admin/posts/:id/publish",      ...adminGuard, idParamValidation, validate,      controller.publish);
router.patch( "/admin/posts/:id/unpublish",    ...adminGuard, idParamValidation, validate,      controller.unpublish);
router.delete("/admin/posts/:id",              ...adminGuard, idParamValidation, validate,      controller.remove);

module.exports = router;
