import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  getAdvisorOptions,
  getMyLatestApplication,
  listApprovedAdvisors,
  submitApplication,
  getProfileAnalytics,
  trackAdvisorClick,
} from "./advisor.controller.js";

const router = express.Router();

router.get("/", listApprovedAdvisors);
router.get("/form-options", getAdvisorOptions);
router.post("/:advisorId/track-click", trackAdvisorClick);
router.post("/form-apply", protect, authorize("advisor"), submitApplication);
router.get("/my-application", protect, authorize("advisor"), getMyLatestApplication);
router.get("/profile-analytics", protect, authorize("advisor"),
getProfileAnalytics);

export default router;
