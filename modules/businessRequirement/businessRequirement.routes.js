import express from "express";
import { authorize, optionalAuth, protect } from "../../common/middleware/auth.js";
import {
  getApprovedBusinessRequirementById,
  getMyRequirement,
  listApprovedBusinessRequirements,
  listMyRequirementClicks,
  submitBusinessRequirement,
  trackRequirementClick,
  updateMyRequirement,
} from "./businessRequirement.controller.js";

const router = express.Router();

// Submit requirement - Restricted to logged-in advisors only
router.post("/", protect, authorize("advisor"), submitBusinessRequirement);

// Get my posted requirement - Restricted to logged-in advisors
router.get("/my-requirement", protect, authorize("advisor"), getMyRequirement);

// Update my posted requirement - Restricted to logged-in advisors
router.put("/my-requirement", protect, authorize("advisor"), updateMyRequirement);

// Approved requirements listing - Title/details public, resource link included ONLY for logged-in users
router.get("/approved", optionalAuth, listApprovedBusinessRequirements);

// Get single approved requirement by ID - Public access
router.get("/approved/:id", optionalAuth, getApprovedBusinessRequirementById);

// Get my resource link clicks - Restricted to logged-in advisors
router.get("/my-clicks", protect, authorize("advisor"), listMyRequirementClicks);

// Track resource link click - Public / Guest or logged-in users
router.post("/:id/track-click", optionalAuth, trackRequirementClick);

export default router;

