import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  addIndustry,
  approveAdvisorApplication,
  listIndustries,
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
router.get("/industries", protect, authorize("admin"), listIndustries);
router.post("/industries", protect, authorize("admin"), addIndustry);

export default router;
