import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  handleSubscribe,
  handleListSubscribers,
  handleDeleteSubscriber,
} from "./newsletter.controller.js";

const router = express.Router();

// Public subscription endpoint
router.post("/subscribe", handleSubscribe);

// Admin-only subscriber management endpoints
router.get("/subscribers", protect, authorize("admin"), handleListSubscribers);
router.delete("/subscribers/:id", protect, authorize("admin"), handleDeleteSubscriber);

export default router;
