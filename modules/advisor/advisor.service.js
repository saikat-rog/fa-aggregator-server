import AdvisorApplication from "../../models/advisorApplication.model.js";
import User from "../../models/user.model.js";
import Industry from "../../models/industry.model.js";
import Category from "../../models/category.model.js";
import RequirementClick from "../../models/requirementClick.model.js";
import { LOCATIONS } from "../../common/constants/LOCATIONS.js";
import { MARKETS } from "../../common/constants/MARKETS.js";
import {
  MARKET_INDICES,
  MARKET_INDICES_BY_COUNTRY,
} from "../../common/constants/MARKET_INDICES.js";

const countryNames = Object.keys(LOCATIONS);
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];
const USERNAME_REGEX = /^[a-z0-9._]+$/;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeAdvisorUsername = (value) => value?.trim().toLowerCase();

const validateAdvisorUsernameOrThrow = (username) => {
  if (!username) {
    throw createError("Username is required");
  }

  if (username.length < 3 || username.length > 30) {
    throw createError("Username must be between 3 and 30 characters");
  }

  if (!USERNAME_REGEX.test(username)) {
    throw createError(
      "Username can contain lowercase letters, numbers, dots and underscores only",
    );
  }
};


const pickSocialLinks = (socialLinks = {}) => ({
  instagram: socialLinks.instagram,
  tiktok: socialLinks.tiktok,
  linkedin: socialLinks.linkedin,
  twitter: socialLinks.twitter,
  facebook: socialLinks.facebook,
  youtube: socialLinks.youtube,
});

const normalizeFollowerMetric = (label, value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw createError(`${label} must be a non-negative integer`);
  }

  return parsed;
};

const normalizePpp = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError("PPP must be a non-negative number");
  }

  return parsed;
};

const normalizeCategory = (value) => {
  const category = typeof value === "string" ? value.trim() : "";
  if (!category) {
    throw createError("Category is required");
  }

  return category;
};

const normalizeAdvisorProfileInput = (data) => {
  const username = normalizeAdvisorUsername(data.username);
  const country = data.country?.trim();
  const state = data.state?.trim();
  const marketFocus = Array.isArray(data.marketFocus) ? data.marketFocus : [];
  const expertiseIndeces = Array.isArray(data.expertiseIndeces)
    ? data.expertiseIndeces
    : [];

  if (!country || !countryNames.includes(country)) {
    throw createError("Valid country is required");
  }

  const statesForCountry = getStatesForCountry(country);
  if (
    statesForCountry.length > 0 &&
    (!state || !statesForCountry.includes(state))
  ) {
    throw createError(`Valid state is required when country is ${country}`);
  }

  if (statesForCountry.length === 0 && state) {
    throw createError(`State is not supported for ${country}`);
  }

  const invalidMarket = marketFocus.find((market) => !MARKETS.includes(market));
  if (invalidMarket) {
    throw createError(`Invalid market focus: ${invalidMarket}`);
  }

  const invalidIndex = expertiseIndeces.find(
    (index) => !MARKET_INDICES.includes(index),
  );
  if (invalidIndex) {
    throw createError(`Invalid expertise index: ${invalidIndex}`);
  }

  validateAdvisorUsernameOrThrow(username);

  return {
    username,
    country,
    state: statesForCountry.length > 0 ? state : undefined,
    socialLinks: pickSocialLinks(data.socialLinks),
    about: data.about?.trim(),
    marketFocus,
    expertiseIndeces,
    emailForContact: data.emailForContact?.trim().toLowerCase(),
    personalWebsite: data.personalWebsite?.trim(),
    ppp: normalizePpp(data.ppp),
    category: normalizeCategory(data.category),
    instagramFollowers: normalizeFollowerMetric("instagramFollowers", data.instagramFollowers),
    youtubeSubscribers: normalizeFollowerMetric("youtubeSubscribers", data.youtubeSubscribers),
    tiktokFollowers: normalizeFollowerMetric("tiktokFollowers", data.tiktokFollowers),
    linkedinFollowers: normalizeFollowerMetric("linkedinFollowers", data.linkedinFollowers),
    facebookFollowers: normalizeFollowerMetric("facebookFollowers", data.facebookFollowers),
    twitterFollowers: normalizeFollowerMetric("twitterFollowers", data.twitterFollowers),
  };
};

const normalizeIndustry = (value) => value?.trim().toLowerCase();

const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage =
    Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage =
    Number.isNaN(parsedLimit) || parsedLimit < 1
      ? 10
      : Math.min(parsedLimit, 100);

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage,
  };
};

const FOLLOWER_FILTER_FIELDS = [
  "instagramFollowers",
  "youtubeSubscribers",
  "tiktokFollowers",
  "linkedinFollowers",
  "facebookFollowers",
  "twitterFollowers",
];

const addFollowerFilters = (filter, query = {}) => {
  for (const field of FOLLOWER_FILTER_FIELDS) {
    const gtRaw = query[`${field}Gt`];
    const gteRaw = query[`${field}Gte`];
    const ltRaw = query[`${field}Lt`];
    const lteRaw = query[`${field}Lte`];

    const hasAnyOperator =
      gtRaw !== undefined ||
      gteRaw !== undefined ||
      ltRaw !== undefined ||
      lteRaw !== undefined;

    if (!hasAnyOperator) {
      continue;
    }

    const operatorValueEntries = [
      ["$gt", gtRaw],
      ["$gte", gteRaw],
      ["$lt", ltRaw],
      ["$lte", lteRaw],
    ];

    const numericOperators = {};
    for (const [operator, raw] of operatorValueEntries) {
      if (raw === undefined) {
        continue;
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        throw createError(`${field}${operator.replace("$", "")} must be a valid number`);
      }

      numericOperators[operator] = parsed;
    }

    filter[`advisorProfile.${field}`] = numericOperators;
  }
};

const parseIndustryQueryValues = (rawIndustries) => {
  if (!rawIndustries) {
    return [];
  }

  const entries = Array.isArray(rawIndustries) ? rawIndustries : [rawIndustries];
  return [
    ...new Set(
      entries
        .flatMap((value) => String(value).split(","))
        .map((value) => normalizeIndustry(value))
        .filter(Boolean),
    ),
  ];
};

const buildAdvisorResponse = (item) => {
  const profile = item?.advisorProfile;
  if (!profile) return null;

  const {
    analytics,
    verificationStatus,
    ...advisorProfileWithoutInternalFields
  } = profile;

  return {
    id: item._id,
    name: item.name || null,
    username: advisorProfileWithoutInternalFields.username || null,
    ...advisorProfileWithoutInternalFields,
    profilePictureUrl:
      advisorProfileWithoutInternalFields.instagramProfilePictureUrl || null,
  };
};

export const submitApplication = async (userId, data) => {
  const profile = normalizeAdvisorProfileInput(data);
  const user = await User.findById(userId);

  if (!user) {
    throw createError("User not found", 404);
  }

  const usernameTakenByAnotherAdvisor = await User.exists({
    _id: { $ne: userId },
    "advisorProfile.username": profile.username,
  });

  if (usernameTakenByAnotherAdvisor) {
    throw createError("Username not available", 409);
  }

  const industriesInput = Array.isArray(data.industries)
    ? data.industries
    : data.industry
      ? [data.industry]
      : [];
  const normalizedIndustriesInput = [
    ...new Set(
      industriesInput
        .map((value) => normalizeIndustry(value))
        .filter(Boolean),
    ),
  ];

  if (normalizedIndustriesInput.length === 0) {
    throw createError("At least one industry is required");
  }

  const matchedIndustries = await Industry.find({
    industryCode: { $in: normalizedIndustriesInput },
  }).select("name industryCode");

  if (matchedIndustries.length !== normalizedIndustriesInput.length) {
    throw createError("One or more selected industries are not available");
  }

  const industriesByCode = new Map(
    matchedIndustries.map((item) => [item.industryCode, item.name]),
  );
  const resolvedIndustries = normalizedIndustriesInput.map(
    (code) => industriesByCode.get(code),
  );

  const profileToSet = Object.fromEntries(
    Object.entries({
      ...profile,
      industries: resolvedIndustries,
    }).filter(([, value]) => value !== undefined),
  );

  const update = {
    $set: {
      ...profileToSet,
      status: "pending",
    },
    $unset: {
      rejectionReason: "",
      reviewedAt: "",
    },
  };

  if (getStatesForCountry(profile.country).length === 0) {
    update.$unset.state = "";
  }

  const application = await AdvisorApplication.findOneAndUpdate(
    { user: userId, status: "pending" },
    update,
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  user.advisorProfile = {
    ...profile,
    industries: resolvedIndustries,
    verificationStatus: "pending",
  };
  await user.save();

  return {
    msg: "Advisor application submitted for admin approval",
    application,
  };
};

export const getMyLatestApplication = async (userId) => {
  const application = await AdvisorApplication.findOne({ user: userId }).sort({
    createdAt: -1,
  });

  return { application };
};

export const checkAdvisorUsernameAvailability = async (query = {}) => {
  const username = normalizeAdvisorUsername(query.username);
  validateAdvisorUsernameOrThrow(username);

  const taken = await User.exists({ "advisorProfile.username": username });

  return {
    isAvailable: !taken,
    msg: taken ? "Username not available" : "Username available",
  };
};

export const listApprovedAdvisors = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const country = query.country?.trim();
  const state = query.state?.trim();
  const category = query.category?.trim();

  if (country && !countryNames.includes(country)) {
    throw createError("Valid country is required");
  }

  if (state && !country) {
    throw createError("Country is required when filtering by state");
  }

  if (country) {
    const statesForCountry = getStatesForCountry(country);

    if (state && statesForCountry.length === 0) {
      throw createError(`State filter is not supported for ${country}`);
    }

    if (state && !statesForCountry.includes(state)) {
      throw createError(`Valid state is required for ${country}`);
    }
  }

  const filter = {
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  };

  if (country) {
    filter["advisorProfile.country"] = country;
  }

  if (state) {
    filter["advisorProfile.state"] = state;
  }

  if (category) {
    filter["advisorProfile.category"] = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const normalizedIndustryFilters = parseIndustryQueryValues(query.industries);
  if (normalizedIndustryFilters.length > 0) {
    const matchedIndustries = await Industry.find({
      industryCode: { $in: normalizedIndustryFilters },
    }).select("name industryCode");

    if (matchedIndustries.length !== normalizedIndustryFilters.length) {
      throw createError("One or more selected industries are not available");
    }

    filter["advisorProfile.industries"] = {
      $in: matchedIndustries.map((item) => item.name),
    };
  }

  addFollowerFilters(filter, query);

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("name advisorProfile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const advisors = items.map((item) => buildAdvisorResponse(item)).filter(Boolean);

  return {
    advisors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdvisorByUsername = async (params = {}) => {
  const username = normalizeAdvisorUsername(params.username);
  validateAdvisorUsernameOrThrow(username);

  const advisor = await User.findOne({
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
    "advisorProfile.username": username,
  })
    .select("name advisorProfile")
    .lean();

  if (!advisor) {
    throw createError("Advisor not found", 404);
  }

  return {
    advisor: buildAdvisorResponse(advisor),
  };
};

export const getAdvisorOptions = async () => {
  const [industries, categories] = await Promise.all([
    Industry.find({}).select("name -_id").sort({ name: 1 }).lean(),
    Category.find({}).select("name -_id").sort({ name: 1 }).lean(),
  ]);

  return {
    locations: LOCATIONS,
    markets: MARKETS,
    marketIndicesByCountry: MARKET_INDICES_BY_COUNTRY,
    industries: industries.map((item) => item.name),
    categories: categories.map((item) => item.name),
  };
};

export const getProfileAnalytics = async (userId) => {
  const [application, advisor] = await Promise.all([
    AdvisorApplication.findOne({ user: userId }).sort({ createdAt: -1 }),
    User.findById(userId).select("advisorProfile.analytics advisorProfile.verificationStatus"),
  ]);

  // The user's advisorProfile.verificationStatus is the ground truth.
  // If it is "approved", the advisor is actively listed — always return 1
  // regardless of what the application record says.
  const isApprovedOnProfile =
    advisor?.advisorProfile?.verificationStatus === "approved";

  const applicationStatus = isApprovedOnProfile
    ? 1
    : application?.status === "approved"
      ? 1
      : application?.status === "rejected"
        ? 0
        : application?.status === "pending"
          ? -1
          : null;

  const analytics = advisor?.advisorProfile?.analytics || {};
  const socialClicks = analytics.socialClicks || {};
  const socialClicksByPlatform = socialClicks.byPlatform || {};

  const resourceClicks = await RequirementClick.countDocuments({ advisorId: userId });

  return {
    applicationStatus,
    rejectionReason: application?.rejectionReason || null,
    profileClicks: analytics.profileClicks || 0,
    socialClicks: socialClicks.total || 0,
    emailClicks: socialClicksByPlatform.email || 0,
    websiteClicks: socialClicksByPlatform.website || 0,
    profileShareClicks: socialClicksByPlatform.profileShare || 0,
    resourceClicks: resourceClicks || 0,
  };
};


export const trackAdvisorClick = async (advisorId, payload = {}) => {
  const clickType = payload.clickType?.trim();

  if (!clickType || !["profile", "social", "email", "website", "profile-share"].includes(clickType)) {
    throw createError("clickType must be one of: profile, social, email, website, profile-share");
  }

  const advisor = await User.findOne({
    _id: advisorId,
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  }).select("_id");

  if (!advisor) {
    throw createError("Advisor not found", 404);
  }

  const inc =
    clickType === "profile"
      ? { "advisorProfile.analytics.profileClicks": 1 }
      : clickType === "email"
        ? {
          "advisorProfile.analytics.socialClicks.total": 1,
          "advisorProfile.analytics.socialClicks.byPlatform.email": 1,
        }
        : clickType === "website"
          ? {
            "advisorProfile.analytics.socialClicks.total": 1,
            "advisorProfile.analytics.socialClicks.byPlatform.website": 1,
          }
          : clickType === "profile-share"
            ? {
              "advisorProfile.analytics.socialClicks.total": 1,
              "advisorProfile.analytics.socialClicks.byPlatform.profileShare": 1,
            }
          : { "advisorProfile.analytics.socialClicks.total": 1 };

  await User.updateOne({ _id: advisorId }, { $inc: inc });

  return { msg: "Click tracked successfully" };
};
