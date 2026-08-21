import axios from "axios";
import env from "../../config/env.js";

const SUPPORTED_PLATFORMS = new Set([
  "instagram",
  "youtube",
  "telegram",
]);

const SOCIALFETCH_API_URL_BY_PLATFORM = {
  instagram: env.socialFetchInstagramApiUrl,
  youtube: env.socialFetchYouTubeApiUrl,
  telegram: env.socialFetchTelegramApiUrl || env.socialFetchInstagramApiUrl,
};

const get = (obj, path) =>
  path
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const pickFirst = (obj, paths = []) => {
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const toNonNegativeInteger = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.trunc(parsed);
};

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

const pickBio = (payload) => {
  const bio = pickFirst(payload, [
    "data.profile.bio",
    "data.bio",
  ]);

  if (typeof bio !== "string" || !bio.trim()) return undefined;
  return bio.trim().slice(0, 1000);
};

const calculateEngagementRateScore = ({ followers, posts = [] }) => {
  if (!followers || !Array.isArray(posts) || posts.length === 0) return undefined;

  const postsWithEngagement = posts
    .slice(0, 12)
    .map((post) => {
      const likes = toNonNegativeInteger(
        pickFirst(post, ["likeCount", "likes", "metrics.likes"]),
      );
      const comments = toNonNegativeInteger(
        pickFirst(post, ["commentCount", "comments", "metrics.comments"]),
      );

      if (likes === undefined && comments === undefined) return undefined;
      return (likes || 0) + (comments || 0);
    })
    .filter((engagement) => engagement !== undefined);

  if (postsWithEngagement.length === 0) return undefined;

  const averageEngagement =
    postsWithEngagement.reduce((total, engagement) => total + engagement, 0) /
    postsWithEngagement.length;

  return roundToTwoDecimals(averageEngagement / (100 * followers));
};

const parseInstagramPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(
    pickFirst(payload, [
      "data.metrics.followers",
      "data.profile.followersCount",
    ]),
  );
  if (followers !== undefined) normalized.instagramFollowers = followers;

  const profilePic = pickFirst(payload, [
    "data.profile.avatarUrl",
    "data.profile.avatarUrlHd",
  ]);
  if (typeof profilePic === "string" && profilePic.trim()) {
    normalized.instagramProfilePictureUrl = profilePic.trim();
  }

  const bio = pickBio(payload);
  if (bio !== undefined) normalized.about = bio;

  const engagementRateScore = calculateEngagementRateScore({
    followers,
    posts: payload?.data?.recentPosts,
  });
  if (engagementRateScore !== undefined) {
    normalized.instagramEngagementRateScore = engagementRateScore;
  }

  return normalized;
};

const parseYouTubePayload = (payload) => {
  const normalized = {};
  const subscribers = toNonNegativeInteger(payload?.data?.metrics?.subscribers);
  if (subscribers !== undefined) normalized.youtubeSubscribers = subscribers;
  const bio = pickBio(payload);
  if (bio !== undefined) normalized.about = bio;
  return normalized;
};



const parseTelegramPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(
    pickFirst(payload, [
      "data.metrics.followers",
      "data.metrics.subscribers",
      "data.metrics.members",
      "data.followersCount",
      "data.subscribersCount",
      "data.membersCount",
      "data.subscribers",
      "data.members",
      "data.followers",
    ]),
  );
  if (followers !== undefined) normalized.telegramFollowers = followers;
  const bio = pickBio(payload);
  if (bio !== undefined) normalized.about = bio;
  return normalized;
};

const PLATFORM_PARSER_BY_PLATFORM = {
  instagram: parseInstagramPayload,
  youtube: parseYouTubePayload,
  telegram: parseTelegramPayload,
};

export const fetchSocialMetrics = async ({ socialLinks = {} }) => {
  const platformHandles = [
    ["instagram", socialLinks?.instagram],
    ["youtube", socialLinks?.youtube],
    ["telegram", socialLinks?.telegram],
  ].filter(([, handle]) => Boolean(String(handle || "").trim()));

  if (platformHandles.length === 0) {
    throw new Error("No supported social links provided");
  }

  const results = await Promise.all(
    platformHandles.map(([platform, handle]) =>
      fetchSocialMetricForPlatform(platform, handle),
    ),
  );

  return Object.assign({}, ...results);
};

export const fetchSocialMetricForPlatform = async (platform, handle) => {
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const platformApiUrl = SOCIALFETCH_API_URL_BY_PLATFORM[platform];
  if (!platformApiUrl) {
    throw new Error(
      `SocialFetch API URL is not configured for platform: ${platform}`,
    );
  }

  if (platform === "youtube") {
    handle = `?handle=${encodeURIComponent(handle)}`;
  }
  if (platform === "telegram") {
    const cleanHandle = String(handle || "").trim().replace(/^@/, "");
    handle = `?url=${encodeURIComponent(`https://t.me/${cleanHandle}`)}`;
  }

  const baseUrl = platformApiUrl.replace(/\/+$/, "");
  const endpoint = handle.startsWith("?")
    ? `${baseUrl}${handle}`
    : `${baseUrl}/${encodeURIComponent(handle)}`;

  // console.log(endpoint);

  const response = await axios.get(endpoint, {
    headers: env.socialFetchApiKey
      ? { "x-api-key": env.socialFetchApiKey }
      : undefined,
    timeout: 15000,
  });

  const payload = response?.data || {};
  const parser = PLATFORM_PARSER_BY_PLATFORM[platform];
  return parser ? parser(payload) : {};
};

export const retryAsync = async (fn, retries = 3, delayMs = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < retries && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
};
