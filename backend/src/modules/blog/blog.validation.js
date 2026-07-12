"use strict";

const { body, param } = require("express-validator");

const uuidParam = (field) =>
  param(field).isUUID().withMessage(`${field} must be a valid UUID`);

const createValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ max: 255 }).withMessage("Title must be 255 characters or fewer"),

  body("content")
    .trim()
    .notEmpty().withMessage("Content is required"),

  body("excerpt")
    .trim()
    .notEmpty().withMessage("Excerpt is required")
    .isLength({ max: 500 }).withMessage("Excerpt must be 500 characters or fewer"),

  body("coverImageUrl")
    .optional({ nullable: true })
    .isURL().withMessage("Cover image must be a valid URL"),

  body("slug")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage("Slug must be 200 characters or fewer"),
];

const updateValidation = [
  uuidParam("id"),

  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Title cannot be empty")
    .isLength({ max: 255 }).withMessage("Title must be 255 characters or fewer"),

  body("content")
    .optional()
    .trim()
    .notEmpty().withMessage("Content cannot be empty"),

  body("excerpt")
    .optional()
    .trim()
    .notEmpty().withMessage("Excerpt cannot be empty")
    .isLength({ max: 500 }).withMessage("Excerpt must be 500 characters or fewer"),

  body("coverImageUrl")
    .optional({ nullable: true })
    .isURL().withMessage("Cover image must be a valid URL"),

  body("slug")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 }).withMessage("Slug must be 200 characters or fewer"),
];

const idParamValidation = [uuidParam("id")];

module.exports = { createValidation, updateValidation, idParamValidation };
