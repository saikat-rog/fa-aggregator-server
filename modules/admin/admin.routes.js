import express from "express";
import { protect, authorize } from "../../common/middleware/auth.js";
import { login, listUsers, listAdvisors } from "./admin.controller.js";

const router = express.Router();

router.post("/login", login);
router.get("/users", protect, authorize("admin"), listUsers);
router.get("/advisors", protect, authorize("admin"), listAdvisors);

export default router;
