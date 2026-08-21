import mongoose from "mongoose";

const expertiseIndexSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    indexCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ExpertiseIndex", expertiseIndexSchema);
