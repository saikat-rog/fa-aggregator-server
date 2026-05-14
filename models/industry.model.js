import mongoose from "mongoose";

const industrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    industryCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
  },
  { timestamps: true },
);

industrySchema.index({ industryCode: 1 }, { unique: true });

export default mongoose.model("Industry", industrySchema);

