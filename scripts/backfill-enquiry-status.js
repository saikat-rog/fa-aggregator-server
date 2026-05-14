import mongoose from "mongoose";
import env from "../config/env.js";
import Enquiry from "../models/enquiry.model.js";

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    const result = await Enquiry.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { respondedAt: { $exists: false } },
        ],
      },
      {
        $set: {
          status: "pending",
          respondedAt: null,
        },
      },
    );

    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log("Enquiry status backfill completed");
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

