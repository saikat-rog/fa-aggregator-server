import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  approveAdvisorApplication,
  listAdvisorApplications,
  listAdvisors,
  listUsers,
  login,
  rejectAdvisorApplication,
} from "./admin.controller.js";

const router = express.Router();

router.post("/login", login);
router.get("/users", protect, authorize("admin"), listUsers);
router.get("/advisors", protect, authorize("admin"), listAdvisors);
router.get("/advisor-applications", protect, authorize("admin"), listAdvisorApplications);
router.patch("/advisor-applications/:id/approve", protect, authorize("admin"), approveAdvisorApplication);
router.patch("/advisor-applications/:id/reject", protect, authorize("admin"), rejectAdvisorApplication);

export default router;
