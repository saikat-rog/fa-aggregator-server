import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  getAdvisorOptions,
  getMyLatestApplication,
  listApprovedAdvisors,
  submitApplication,
} from "./advisor.controller.js";

const router = express.Router();

router.get("/", listApprovedAdvisors);
router.get("/options", getAdvisorOptions);
router.post("/apply", protect, authorize("advisor"), submitApplication);
router.get("/my-application", protect, authorize("advisor"), getMyLatestApplication);

export default router;
