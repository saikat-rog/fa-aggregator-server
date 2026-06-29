import mongoose from "mongoose";
import env from "../config/env.js";
import User from "../models/user.model.js";
import AdvisorApplication from "../models/advisorApplication.model.js";
import { fetchSocialMetrics, retryAsync } from "../common/services/socialFetch.service.js";
import { buildAdvisorSocialProfileSetPayload } from "../common/services/advisorSocialSync.service.js";

const run = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    const advisors = await User.find({
      roles: "advisor",
      "advisorProfile.verificationStatus": "approved",
    }).select("_id name advisorProfile.socialLinks");

    console.log(`Found ${advisors.length} approved advisors`);

    let updated = 0;
    let failed = 0;

    for (const advisor of advisors) {
      try {
        const metrics = await retryAsync(
          () =>
            fetchSocialMetrics({
              socialLinks: advisor?.advisorProfile?.socialLinks || {},
            }),
          env.socialFetchApprovalMaxRetries,
          1500,
        );

        const setPayload = buildAdvisorSocialProfileSetPayload(metrics);

        await User.updateOne(
          { _id: advisor._id },
          {
            $set: setPayload,
            $unset: { "advisorProfile.socialMetricsLastError": "" },
          },
        );

        await AdvisorApplication.updateMany(
          { user: advisor._id, status: "approved" },
          {
            $set: {
              ...(metrics.instagramFollowers !== undefined
                ? { instagramFollowers: metrics.instagramFollowers }
                : {}),
              ...(metrics.instagramEngagementRateScore !== undefined
                ? { instagramEngagementRateScore: metrics.instagramEngagementRateScore }
                : {}),
              ...(metrics.youtubeSubscribers !== undefined
                ? { youtubeSubscribers: metrics.youtubeSubscribers }
                : {}),
              ...(metrics.tiktokFollowers !== undefined
                ? { tiktokFollowers: metrics.tiktokFollowers }
                : {}),
              ...(metrics.linkedinFollowers !== undefined
                ? { linkedinFollowers: metrics.linkedinFollowers }
                : {}),
              ...(metrics.facebookFollowers !== undefined
                ? { facebookFollowers: metrics.facebookFollowers }
                : {}),
              ...(metrics.twitterFollowers !== undefined
                ? { twitterFollowers: metrics.twitterFollowers }
                : {}),
            },
          },
        );

        updated += 1;
        console.log(`Updated advisor ${advisor._id}`);
      } catch (error) {
        failed += 1;
        await User.updateOne(
          { _id: advisor._id },
          {
            $set: {
              "advisorProfile.socialMetricsSyncStatus": "failed",
              "advisorProfile.socialMetricsLastError":
                error?.message || "Unknown SocialFetch error",
            },
          },
        );
        console.error(`Failed advisor ${advisor._id}:`, error.message);
      }
    }

    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log("Advisor social metrics recalculation completed");
  } catch (error) {
    console.error("Recalculation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
