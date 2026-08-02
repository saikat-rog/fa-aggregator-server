import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import {
  createBlog,
  deleteBlog,
  getBlogByIdAdmin,
  listBlogsAdmin,
  publishBlog,
  unpublishBlog,
  updateBlog,
} from "../blog/blog.controller.js";
import {
  addIndustry,
  addCategory,
  approveAdvisorApplication,
  getAdvisorDetails,
  listAdvisorEnquiries,
  listIndustries,
  listCategories,
  listAdvisorApplications,
  listAdvisors,
  listUsers,
  login,
  rejectAdvisorApplication,
  removeAdvisorProfile,
  updateAdvisorApplication,
} from "./admin.controller.js";
import {
  approveBusinessRequirementAdmin,
  getBusinessRequirementByIdAdmin,
  listBusinessRequirementsAdmin,
  listRequirementClicksAdmin,
} from "../businessRequirement/businessRequirement.controller.js";

const router = express.Router();

router.post("/login", login);
router.get("/users", protect, authorize("admin"), listUsers);
router.get("/advisors", protect, authorize("admin"), listAdvisors);
router.get("/advisors/:userId", protect, authorize("admin"), getAdvisorDetails);
router.delete("/advisors/:userId/profile", protect, authorize("admin"), removeAdvisorProfile);
router.get("/advisor-applications", protect, authorize("admin"), listAdvisorApplications);
router.patch("/advisor-applications/:id", protect, authorize("admin"), updateAdvisorApplication);
router.patch("/advisor-applications/:id/approve", protect, authorize("admin"), approveAdvisorApplication);
router.patch("/advisor-applications/:id/reject", protect, authorize("admin"), rejectAdvisorApplication);
router.get("/industries", protect, authorize("admin"), listIndustries);
router.post("/industries", protect, authorize("admin"), addIndustry);
router.get("/categories", protect, authorize("admin"), listCategories);
router.post("/categories", protect, authorize("admin"), addCategory);
router.get("/advisors/:advisorId/enquiries", protect, authorize("admin"), listAdvisorEnquiries);
router.get("/blogs", protect, authorize("admin"), listBlogsAdmin);
router.post("/blogs", protect, authorize("admin"), createBlog);
router.get("/blogs/:id", protect, authorize("admin"), getBlogByIdAdmin);
router.patch("/blogs/:id", protect, authorize("admin"), updateBlog);
router.patch("/blogs/:id/publish", protect, authorize("admin"), publishBlog);
router.patch("/blogs/:id/unpublish", protect, authorize("admin"), unpublishBlog);
router.delete("/blogs/:id", protect, authorize("admin"), deleteBlog);
router.get("/business-requirements/clicks", protect, authorize("admin"), listRequirementClicksAdmin);
router.get("/business-requirements", protect, authorize("admin"), listBusinessRequirementsAdmin);
router.get("/business-requirements/:id", protect, authorize("admin"), getBusinessRequirementByIdAdmin);
router.patch("/business-requirements/:id/approve", protect, authorize("admin"), approveBusinessRequirementAdmin);

export default router;
