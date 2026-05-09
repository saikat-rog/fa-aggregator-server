// modules/auth/otp.model.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  expiresAt: Date,
  role: {
    type: String,
    enum: ["user", "advisor"],
    default: "user"
  }
});

export default mongoose.model("OTP", otpSchema);