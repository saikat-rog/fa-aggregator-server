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
  approveAdvisorApplication,
  getAdvisorDetails,
  listAdvisorEnquiries,
  listIndustries,
  listAdvisorApplications,
  listAdvisors,
  listUsers,
  login,
  rejectAdvisorApplication,
  updateAdvisorApplication,
} from "./admin.controller.js";

const router = express.Router();

router.post("/login", login);
router.get("/users", protect, authorize("admin"), listUsers);
router.get("/advisors", protect, authorize("admin"), listAdvisors);
router.get("/advisors/:userId", protect, authorize("admin"), getAdvisorDetails);
router.get("/advisor-applications", protect, authorize("admin"), listAdvisorApplications);
router.patch("/advisor-applications/:id", protect, authorize("admin"), updateAdvisorApplication);
router.patch("/advisor-applications/:id/approve", protect, authorize("admin"), approveAdvisorApplication);
router.patch("/advisor-applications/:id/reject", protect, authorize("admin"), rejectAdvisorApplication);
router.get("/industries", protect, authorize("admin"), listIndustries);
router.post("/industries", protect, authorize("admin"), addIndustry);
router.get("/advisors/:advisorId/enquiries", protect, authorize("admin"), listAdvisorEnquiries);
router.get("/blogs", protect, authorize("admin"), listBlogsAdmin);
router.post("/blogs", protect, authorize("admin"), createBlog);
router.get("/blogs/:id", protect, authorize("admin"), getBlogByIdAdmin);
router.patch("/blogs/:id", protect, authorize("admin"), updateBlog);
router.patch("/blogs/:id/publish", protect, authorize("admin"), publishBlog);
router.patch("/blogs/:id/unpublish", protect, authorize("admin"), unpublishBlog);
router.delete("/blogs/:id", protect, authorize("admin"), deleteBlog);

export default router;
