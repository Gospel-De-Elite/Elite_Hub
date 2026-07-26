"use strict";

const fs           = require("fs");
const path         = require("path");
const express      = require("express");
const multer       = require("multer");
const controller   = require("./blog.controller");
const validate     = require("../../common/middleware/validate");
const authenticate = require("../../common/middleware/authenticate");
const authorize    = require("../../common/middleware/authorize");
const ApiError     = require("../../common/errors/ApiError");
const {
  createValidation,
  updateValidation,
  idParamValidation,
} = require("./blog.validation");

const router = express.Router();

// ─── Multer — blog image uploads ─────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), "uploads", "blog");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `blog-${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(ApiError.badRequest("Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed."), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Public routes — no auth required ────────────────────────────────────────
router.get("/posts",        controller.listPublished);
router.get("/posts/:slug",  controller.getBySlug);
router.get("/slug-preview", controller.previewSlug);

// ─── Admin routes — ADMIN or SUPER_ADMIN only ─────────────────────────────────
const adminGuard = [authenticate, authorize("ADMIN", "SUPER_ADMIN")];

router.post(  "/admin/upload",              ...adminGuard, upload.single("image"),            controller.uploadImage);
router.get(   "/admin/posts",               ...adminGuard,                                    controller.listAll);
router.get(   "/admin/posts/:id",           ...adminGuard, idParamValidation, validate,       controller.getById);
router.post(  "/admin/posts",               ...adminGuard, createValidation,  validate,       controller.create);
router.patch( "/admin/posts/:id",           ...adminGuard, updateValidation,  validate,       controller.update);
router.patch( "/admin/posts/:id/publish",   ...adminGuard, idParamValidation, validate,       controller.publish);
router.patch( "/admin/posts/:id/unpublish", ...adminGuard, idParamValidation, validate,       controller.unpublish);
router.delete("/admin/posts/:id",           ...adminGuard, idParamValidation, validate,       controller.remove);

module.exports = router;
