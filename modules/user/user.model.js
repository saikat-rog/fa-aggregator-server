import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  roles: {
    type: [{
      type: String,
      enum: ["user", "advisor"]
    }],
    default: ["user"]
  },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("User", userSchema);