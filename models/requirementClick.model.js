import mongoose from "mongoose";

const requirementClickSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessRequirement",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    advisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    advisorName: {
      type: String,
      trim: true,
    },
    advisorUsername: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

requirementClickSchema.index({ clickedAt: -1 });

export default mongoose.model("RequirementClick", requirementClickSchema);
