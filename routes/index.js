import express from "express";
import userRoutes from "../modules/user/user.routes.js";
import advisorRoutes from "../modules/advisor/advisor.routes.js";
import authRoutes from "../modules/auth/auth.routes.js";
import adminRoutes from "../modules/admin/admin.routes.js";
import blogRoutes from "../modules/blog/blog.routes.js";
import businessRequirementRoutes from "../modules/businessRequirement/businessRequirement.routes.js";
import campaignApplicationRoutes from "../modules/campaignApplication/campaignApplication.routes.js";
import pricingPlanRoutes from "../modules/pricingPlan/pricingPlan.routes.js";
import newsletterRoutes from "../modules/newsletter/newsletter.routes.js";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/advisor", advisorRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/blog", blogRoutes);
router.use("/business-requirements", businessRequirementRoutes);
router.use("/campaign-applications", campaignApplicationRoutes);
router.use("/pricing-plans", pricingPlanRoutes);
router.use("/newsletter", newsletterRoutes);

export default router;

