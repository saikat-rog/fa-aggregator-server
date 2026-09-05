import express from "express";
import userRoutes from "../modules/user/user.routes.js";
import advisorRoutes from "../modules/advisor/advisor.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import blogRoutes from "../modules/blog/blog.routes.js";
import businessRequirementRoutes from "../modules/businessRequirement/businessRequirement.routes.js";
import campaignApplicationRoutes from "../modules/campaignApplication/campaignApplication.routes.js";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/advisor", advisorRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/blog", blogRoutes);
router.use("/business-requirements", businessRequirementRoutes);
router.use("/campaign-applications", campaignApplicationRoutes);

export default router;
