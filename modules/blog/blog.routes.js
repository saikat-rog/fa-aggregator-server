import express from "express";
import {
  listPublishedBlogs,
  getPublishedBlogBySlug
} from "./blog.controller.js";

const router = express.Router();

router.get("/", listPublishedBlogs);
router.get("/:slug", getPublishedBlogBySlug);

export default router;
