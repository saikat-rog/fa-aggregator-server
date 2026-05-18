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
    currentMonthlySales: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    goalMonthlySales: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    desiredInfluencerScope: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    campaignObjective: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    detailedRequirements: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
  },
  { timestamps: true },
);

businessRequirementSchema.index({ createdAt: -1 });
businessRequirementSchema.index({ businessEmail: 1, createdAt: -1 });

export default mongoose.model("BusinessRequirement", businessRequirementSchema);
