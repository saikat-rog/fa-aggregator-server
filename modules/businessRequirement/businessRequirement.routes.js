import express from "express";
import { authorize, optionalAuth, protect } from "../../common/middleware/auth.js";
import {
  listApprovedBusinessRequirements,
  submitBusinessRequirement,
  trackRequirementClick,
} from "./businessRequirement.controller.js";

const router = express.Router();

// Submit requirement - Restricted to logged-in advisors only
router.post("/", protect, authorize("advisor"), submitBusinessRequirement);

// Approved requirements listing - Title/details public, resource link included ONLY for logged-in users
router.get("/approved", optionalAuth, listApprovedBusinessRequirements);

// Track resource link click - Restricted to logged-in users only
router.post("/:id/track-click", protect, authorize("user"), trackRequirementClick);

export default router;
