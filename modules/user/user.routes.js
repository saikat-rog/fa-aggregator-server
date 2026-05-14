import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  listMyEnquiries,
  listSavedAdvisors,
  saveAdvisor,
  submitAdvisorEnquiry,
  unsaveAdvisor,
} from "./user.controller.js";

const router = express.Router();

router.post("/submit-enquiry/advisor/:advisorId", protect, authorize("user"), submitAdvisorEnquiry);
router.get("/my-enquiries", protect, authorize("user"), listMyEnquiries);
router.post("/saved-advisors/:advisorId", protect, authorize("user"), saveAdvisor);
router.delete("/saved-advisors/:advisorId", protect, authorize("user"), unsaveAdvisor);
router.get("/saved-advisors", protect, authorize("user"), listSavedAdvisors);

export default router;
