import mongoose from "mongoose";

const businessRequirementSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    businessEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid business email"],
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    currentMonthlySales: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    goalMonthlySales: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    desiredInfluencerScope: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    campaignObjective: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    detailedRequirements: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    socialLinks: {
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      telegram: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      index: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    editStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
      index: true,
    },
    pendingEdit: {
      companyName: { type: String, trim: true },
      businessEmail: { type: String, trim: true, lowercase: true },
      url: { type: String, trim: true },
      currentMonthlySales: { type: String, trim: true },
      goalMonthlySales: { type: String, trim: true },
      desiredInfluencerScope: { type: String, trim: true },
      campaignObjective: { type: String, trim: true },
      detailedRequirements: { type: String, trim: true },
      submittedAt: { type: Date },
    },
    advisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postedByAdvisorName: {
      type: String,
      trim: true,
    },
    postedByAdvisorUsername: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

businessRequirementSchema.index({ createdAt: -1 });
businessRequirementSchema.index({ businessEmail: 1, createdAt: -1 });
businessRequirementSchema.index({ status: 1, approvedAt: -1 });

export default mongoose.model("BusinessRequirement", businessRequirementSchema);
