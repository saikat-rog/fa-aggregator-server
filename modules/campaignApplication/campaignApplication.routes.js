import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  submitCampaignApplication,
  listOwnerReceivedApplications,
  markApplicationResponded,
  updateApplicationStatus,
  listAdvisorMyApplications,
} from "./campaignApplication.controller.js";

const router = express.Router();

router.post("/:campaignId/apply", protect, submitCampaignApplication);
router.get("/my-received", protect, listOwnerReceivedApplications);
router.get("/my-applications", protect, listAdvisorMyApplications);
router.patch("/:id/status", protect, updateApplicationStatus);
router.patch("/:id/mark-responded", protect, markApplicationResponded);

export default router;
