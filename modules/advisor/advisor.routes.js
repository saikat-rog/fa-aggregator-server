import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  checkAdvisorUsernameAvailability,
  getAdvisorByUsername,
  getAdvisorOptions,
  getMyLatestApplication,
  listMyEnquiries,
  listApprovedAdvisors,
  submitApplication,
  getProfileAnalytics,
  trackAdvisorClick,
} from "./advisor.controller.js";

const router = express.Router();

router.get("/", listApprovedAdvisors);
router.get("/username-availability", checkAdvisorUsernameAvailability);
router.get("/username/:username", getAdvisorByUsername);
router.get("/form-options", getAdvisorOptions);
router.post("/:advisorId/track-click", trackAdvisorClick);
router.post("/form-apply", protect, authorize("advisor"), submitApplication);
router.get("/my-application", protect, authorize("advisor"), getMyLatestApplication);
router.get("/my-enquiries", protect, authorize("advisor"), listMyEnquiries);
router.get("/profile-analytics", protect, authorize("advisor"),
getProfileAnalytics);

export default router;
