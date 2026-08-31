import express from "express";
import { authorize, optionalAuth, protect } from "../../common/middleware/auth.js";
import {
  checkStoreUsernameAvailability,
  getApprovedBusinessRequirementById,
  getMyRequirement,
  listApprovedBusinessRequirements,
  listMyRequirementClicks,
  submitBusinessRequirement,
  trackRequirementClick,
  updateMyRequirement,
} from "./businessRequirement.controller.js";

const router = express.Router();

// Username availability check
router.get("/username-availability", optionalAuth, checkStoreUsernameAvailability);

// Submit requirement - Logged-in users & advisors
router.post("/", protect, submitBusinessRequirement);

// Get my posted requirement - Logged-in users & advisors
router.get("/my-requirement", protect, getMyRequirement);

// Update my posted requirement - Logged-in users & advisors
router.put("/my-requirement", protect, updateMyRequirement);

// Approved requirements listing - Title/details public, resource link included ONLY for logged-in users
router.get("/approved", optionalAuth, listApprovedBusinessRequirements);

// Get single approved requirement by ID or storeUsername - Public access
router.get("/approved/:id", optionalAuth, getApprovedBusinessRequirementById);

// Get my resource link clicks - Logged-in users & advisors
router.get("/my-clicks", protect, listMyRequirementClicks);

// Track resource link click - Public / Guest or logged-in users
router.post("/:id/track-click", optionalAuth, trackRequirementClick);

export default router;

