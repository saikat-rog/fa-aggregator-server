import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  submitCampaignApplication,
  listOwnerReceivedApplications,
  markApplicationResponded,
} from "./campaignApplication.controller.js";

const router = express.Router();

router.post("/:campaignId/apply", protect, authorize("advisor"), submitCampaignApplication);
router.get("/my-received", protect, listOwnerReceivedApplications);
router.patch("/:id/mark-responded", protect, markApplicationResponded);

export default router;
