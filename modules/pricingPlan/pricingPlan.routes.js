import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  getPublicPricingPlans,
  getAllPricingPlansAdmin,
  updatePricingPlanAdmin,
  createPricingPlanAdmin,
  deletePricingPlanAdmin,
} from "./pricingPlan.controller.js";

const router = express.Router();

// Public route to view plans
router.get("/", getPublicPricingPlans);

// Admin-protected routes
router.get("/admin/all", protect, authorize("admin"), getAllPricingPlansAdmin);
router.post("/admin", protect, authorize("admin"), createPricingPlanAdmin);
router.put("/admin/:id", protect, authorize("admin"), updatePricingPlanAdmin);
router.patch("/admin/:id", protect, authorize("admin"), updatePricingPlanAdmin);
router.delete("/admin/:id", protect, authorize("admin"), deletePricingPlanAdmin);

export default router;
