import mongoose from "mongoose";
import env from "../config/env.js";
import User from "../models/user.model.js";

const FOLLOWER_FIELDS = [
  "advisorProfile.instagramFollowers",
  "advisorProfile.youtubeSubscribers",
  "advisorProfile.tiktokFollowers",
  "advisorProfile.linkedinFollowers",
  "advisorProfile.facebookFollowers",
  "advisorProfile.twitterFollowers",
];

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    const filter = {
      $or: FOLLOWER_FIELDS.map((field) => ({ [field]: { $exists: false } })),
    };

    const setPayload = Object.fromEntries(
      FOLLOWER_FIELDS.map((field) => [field, 2401]),
    );

    const result = await User.updateMany(filter, { $set: setPayload });

    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log("Backfill completed");
  } catch (error) {
    console.error("Backfill failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

