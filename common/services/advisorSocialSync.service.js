import env from "../../config/env.js";
import User from "../../models/user.model.js";
import { fetchSocialMetrics, retryAsync } from "./socialFetch.service.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let socialSyncIntervalHandle = null;

const buildSocialUpdate = (metrics) => {
  const setPayload = {
    "advisorProfile.socialMetricsLastSyncedAt": new Date(),
    "advisorProfile.socialMetricsSyncStatus": "success",
  };

  if (metrics.instagramFollowers !== undefined) {
    setPayload["advisorProfile.instagramFollowers"] = metrics.instagramFollowers;
  }
  if (metrics.youtubeSubscribers !== undefined) {
    setPayload["advisorProfile.youtubeSubscribers"] = metrics.youtubeSubscribers;
  }
  if (metrics.tiktokFollowers !== undefined) {
    setPayload["advisorProfile.tiktokFollowers"] = metrics.tiktokFollowers;
  }
  if (metrics.linkedinFollowers !== undefined) {
    setPayload["advisorProfile.linkedinFollowers"] = metrics.linkedinFollowers;
  }
  if (metrics.facebookFollowers !== undefined) {
    setPayload["advisorProfile.facebookFollowers"] = metrics.facebookFollowers;
  }
  if (metrics.twitterFollowers !== undefined) {
    setPayload["advisorProfile.twitterFollowers"] = metrics.twitterFollowers;
  }
  if (metrics.instagramProfilePictureUrl) {
    setPayload["advisorProfile.instagramProfilePictureUrl"] = metrics.instagramProfilePictureUrl;
  }

  return setPayload;
};

const syncAdvisorSocialMetrics = async ({ socialLinks, retries }) => {
  const metrics = await retryAsync(
    () => fetchSocialMetrics({ socialLinks }),
    retries,
    1500,
  );

  return metrics;
};

export const syncAdvisorSocialMetricsForApproval = async ({ socialLinks }) => {
  return syncAdvisorSocialMetrics({
    socialLinks,
    retries: env.socialFetchApprovalMaxRetries,
  });
};

const saveMonthlyFailure = async (userId, error) => {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "advisorProfile.socialMetricsSyncStatus": "failed",
        "advisorProfile.socialMetricsLastError": error?.message || "Unknown SocialFetch error",
      },
    },
  );
};

export const refreshAdvisorSocialMetricsIfDue = async (user) => {
  const lastSyncedAt = user?.advisorProfile?.socialMetricsLastSyncedAt;
  const syncIntervalMs = Math.max(1, env.socialFetchMonthlyIntervalDays) * ONE_DAY_MS;

  if (lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() < syncIntervalMs) {
    return false;
  }

  try {
    const metrics = await syncAdvisorSocialMetrics({
      socialLinks: user?.advisorProfile?.socialLinks || {},
      retries: env.socialFetchMonthlyMaxRetries,
    });

    await User.updateOne(
      { _id: user._id },
      {
        $set: buildSocialUpdate(metrics),
        $unset: { "advisorProfile.socialMetricsLastError": "" },
      },
    );
  } catch (error) {
    await saveMonthlyFailure(user._id, error);
  }

  return true;
};

export const runMonthlyAdvisorSocialMetricsRefresh = async () => {
  const advisors = await User.find({
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  }).select("_id advisorProfile.socialLinks advisorProfile.socialMetricsLastSyncedAt");

  for (const advisor of advisors) {
    await refreshAdvisorSocialMetricsIfDue(advisor);
  }
};

export const startAdvisorSocialMetricsRefreshJob = () => {
  if (socialSyncIntervalHandle) return;

  runMonthlyAdvisorSocialMetricsRefresh().catch((error) => {
    console.error("Initial advisor social metrics refresh failed:", error?.message || error);
  });

  socialSyncIntervalHandle = setInterval(() => {
    runMonthlyAdvisorSocialMetricsRefresh().catch((error) => {
      console.error("Advisor social metrics refresh failed:", error?.message || error);
    });
  }, Math.max(60 * 1000, env.socialFetchCronMs));
};

export const buildAdvisorSocialProfileSetPayload = (metrics) => buildSocialUpdate(metrics);
