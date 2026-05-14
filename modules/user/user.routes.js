import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import { submitAdvisorEnquiry } from "./user.controller.js";

const router = express.Router();

router.post("/submit-enquiry/advisor/:advisorId", protect, authorize("user"), submitAdvisorEnquiry);

export default router;
