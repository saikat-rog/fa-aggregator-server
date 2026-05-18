// modules/auth/auth.routes.js
import express from "express";
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  refreshToken,
  logout,
  googleAuth,
  createRolePassword,
  requestPasswordResetOtp,
  resetPasswordWithOtp
} from "./auth.controller.js";
import { protect } from "../../common/middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/password/create", protect, createRolePassword);
router.post("/password/forgot", requestPasswordResetOtp);
router.post("/password/reset", resetPasswordWithOtp);

export default router;
