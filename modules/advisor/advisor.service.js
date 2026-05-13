import AdvisorApplication from "../../models/advisorApplication.model.js";
import User from "../../models/user.model.js";
import { LOCATIONS } from "../../common/constants/LOCATIONS.js";
import { MARKETS } from "../../common/constants/MARKETS.js";
import {
  MARKET_INDICES,
  MARKET_INDICES_BY_COUNTRY,
} from "../../common/constants/MARKET_INDICES.js";

const countryNames = Object.keys(LOCATIONS);
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const pickSocialLinks = (socialLinks = {}) => ({
  instagram: socialLinks.instagram,
  linkedin: socialLinks.linkedin,
  twitter: socialLinks.twitter,
  facebook: socialLinks.facebook,
  youtube: socialLinks.youtube,
});

const normalizeAdvisorProfileInput = (data) => {
  const country = data.country?.trim();
  const state = data.state?.trim();
  const marketFocus = Array.isArray(data.marketFocus) ? data.marketFocus : [];
  const expertiseIndeces = Array.isArray(data.expertiseIndeces) ? data.expertiseIndeces : [];

  if (!country || !countryNames.includes(country)) {
    throw createError("Valid country is required");
  }

  const statesForCountry = getStatesForCountry(country);
  if (statesForCountry.length > 0 && (!state || !statesForCountry.includes(state))) {
    throw createError(`Valid state is required when country is ${country}`);
  }

  if (statesForCountry.length === 0 && state) {
    throw createError(`State is not supported for ${country}`);
  }

  const invalidMarket = marketFocus.find((market) => !MARKETS.includes(market));
  if (invalidMarket) {
    throw createError(`Invalid market focus: ${invalidMarket}`);
  }

  const invalidIndex = expertiseIndeces.find((index) => !MARKET_INDICES.includes(index));
  if (invalidIndex) {
    throw createError(`Invalid expertise index: ${invalidIndex}`);
  }

  if (!data.about?.trim()) {
    throw createError("About is required");
  }

  return {
    country,
    state: statesForCountry.length > 0 ? state : undefined,
    socialLinks: pickSocialLinks(data.socialLinks),
    about: data.about.trim(),
    marketFocus,
    expertiseIndeces,
    emailForContact: data.emailForContact?.trim().toLowerCase(),
    personalWebsite: data.personalWebsite?.trim(),
  };
};

const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage,
  };
};

export const submitApplication = async (userId, data) => {
  const profile = normalizeAdvisorProfileInput(data);
  const user = await User.findById(userId);

  if (!user) {
    throw createError("User not found", 404);
  }

  const profileToSet = Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== undefined),
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
    verificationStatus: "pending",
  };
  await user.save();

  return {
    msg: "Advisor application submitted for admin approval",
    application,
  };
};

export const getMyLatestApplication = async (userId) => {
  const application = await AdvisorApplication.findOne({ user: userId }).sort({ createdAt: -1 });

  return { application };
};

export const listApprovedAdvisors = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const country = query.country?.trim();
  const state = query.state?.trim();

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

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("advisorProfile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    advisors: items
      .map((item) => {
        const profile = item.advisorProfile;
        if (!profile) return null;

        const {
          analytics,
          verificationStatus,
          ...advisorProfileWithoutInternalFields
        } = profile;
        return {
          id: item._id,
          ...advisorProfileWithoutInternalFields,
        };
      })
      .filter(Boolean),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdvisorOptions = () => ({
  countries: countryNames,
  locations: LOCATIONS,
  markets: MARKETS,
  marketIndicesByCountry: MARKET_INDICES_BY_COUNTRY,
});

export const getProfileAnalytics = async (userId) => {
  const [application, advisor] = await Promise.all([
    AdvisorApplication.findOne({ user: userId }).sort({ createdAt: -1 }),
    User.findById(userId).select("advisorProfile.analytics"),
  ]);

  const applicationStatus = application?.status === "approved"
    ? 1
    : application?.status === "rejected"
      ? 0
      : application?.status === "pending"
        ? -1
        : null;

  const analytics = advisor?.advisorProfile?.analytics || {};
  const socialClicks = analytics.socialClicks || {};

  return {
    applicationStatus,
    rejectionReason: application?.rejectionReason || null,
    profileClicks: analytics.profileClicks || 0,
    socialClicks: socialClicks.total || 0,
  };
};

export const trackAdvisorClick = async (advisorId, payload = {}) => {
  const clickType = payload.clickType?.trim();

  if (!clickType || !["profile", "social"].includes(clickType)) {
    throw createError("clickType must be one of: profile, social");
  }

  const advisor = await User.findOne({
    _id: advisorId,
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  }).select("_id");

  if (!advisor) {
    throw createError("Advisor not found", 404);
  }

  const inc = clickType === "profile"
    ? { "advisorProfile.analytics.profileClicks": 1 }
    : { "advisorProfile.analytics.socialClicks.total": 1 };

  await User.updateOne({ _id: advisorId }, { $inc: inc });

  return { msg: "Click tracked successfully" };
};
