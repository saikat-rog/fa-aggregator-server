// modules/auth/otp.model.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  expiresAt: Date,
  purpose: {
    type: String,
    enum: ["verify_email", "reset_password"],
    default: "verify_email"
  },
  role: {
    type: String,
    enum: ["user", "advisor"],
    default: "user"
  }
});

export default mongoose.model("OTP", otpSchema);
