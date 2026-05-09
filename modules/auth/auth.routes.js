// modules/auth/auth.routes.js
import express from "express";
import {
  register,
  login,
  verifyOTP,
  refreshToken,
  logout
} from "./auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
