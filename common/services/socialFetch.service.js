import axios from "axios";
import env from "../../config/env.js";

const SUPPORTED_PLATFORMS = new Set([
  "instagram",
  "tiktok",
  "linkedin",
  "twitter",
  "facebook",
  "youtube",
]);

const SOCIALFETCH_API_URL_BY_PLATFORM = {
  instagram: env.socialFetchInstagramApiUrl,
  tiktok: env.socialFetchTikTokApiUrl,
  linkedin: env.socialFetchLinkedInApiUrl,
  twitter: env.socialFetchTwitterApiUrl,
  facebook: env.socialFetchFacebookApiUrl,
  youtube: env.socialFetchYouTubeApiUrl,
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

  return normalized;
};

const parseTikTokPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(payload?.data?.metrics?.followers);
  if (followers !== undefined) normalized.tiktokFollowers = followers;
  return normalized;
};

const parseLinkedInPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(
    pickFirst(payload, [
      "data.metrics.followers",
      "data.profile.followersCount",
    ]),
  );
  if (followers !== undefined) normalized.linkedinFollowers = followers;
  return normalized;
};

const parseTwitterPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(payload?.data?.metrics?.followers);
  if (followers !== undefined) normalized.twitterFollowers = followers;
  return normalized;
};

const parseFacebookPayload = (payload) => {
  const normalized = {};
  const followers = toNonNegativeInteger(payload?.data?.metrics?.followers);
  if (followers !== undefined) normalized.facebookFollowers = followers;
  return normalized;
};

const parseYouTubePayload = (payload) => {
  const normalized = {};
  const subscribers = toNonNegativeInteger(payload?.data?.metrics?.subscribers);
  if (subscribers !== undefined) normalized.youtubeSubscribers = subscribers;
  return normalized;
};

const PLATFORM_PARSER_BY_PLATFORM = {
  instagram: parseInstagramPayload,
  tiktok: parseTikTokPayload,
  linkedin: parseLinkedInPayload,
  twitter: parseTwitterPayload,
  facebook: parseFacebookPayload,
  youtube: parseYouTubePayload,
};

export const fetchSocialMetrics = async ({ socialLinks = {} }) => {
  const platformHandles = [
    ["instagram", socialLinks?.instagram],
    ["tiktok", socialLinks?.tiktok],
    ["linkedin", socialLinks?.linkedin],
    ["twitter", socialLinks?.twitter],
    ["facebook", socialLinks?.facebook],
    ["youtube", socialLinks?.youtube],
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

  if (platform === "facebook") {
    handle = `?url=${encodeURIComponent(`https://www.facebook.com/${handle}`)}`;
  }
  if (platform === "youtube") {
    handle = `?handle=${encodeURIComponent(handle)}`;
  }
  if (platform === "linkedin") {
    handle = `?url=${encodeURIComponent(`https://www.linkedin.com/in/${handle}`)}`;
  }

  const baseUrl = platformApiUrl.replace(/\/+$/, "");
  const endpoint = handle.startsWith("?")
    ? `${baseUrl}${handle}`
    : `${baseUrl}/${encodeURIComponent(handle)}`;

  console.log(endpoint);

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
