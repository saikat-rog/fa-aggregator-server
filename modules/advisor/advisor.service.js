import AdvisorApplication from "../../models/advisorApplication.model.js";
import User from "../../models/user.model.js";
import { COUNTRIES } from "../../common/constants/COUNTRIES.js";
import { INDIAN_STATES } from "../../common/constants/INDIAN_STATES.js";
import { MARKETS } from "../../common/constants/MARKETS.js";
import {
  MARKET_INDICES_BY_COUNTRY,
  getMarketIndicesForCountry,
} from "../../common/constants/MARKET_INDICES.js";

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
});

const normalizeAdvisorProfileInput = (data) => {
  const country = data.country?.trim();
  const state = data.state?.trim();
  const marketFocus = Array.isArray(data.marketFocus) ? data.marketFocus : [];
  const expertiseIndeces = Array.isArray(data.expertiseIndeces) ? data.expertiseIndeces : [];

  if (!country || !COUNTRIES.includes(country)) {
    throw createError("Valid country is required");
  }

  if (country === "India") {
    if (!state || !INDIAN_STATES.includes(state)) {
      throw createError("Valid state is required when country is India");
    }
  }

  const invalidMarket = marketFocus.find((market) => !MARKETS.includes(market));
  if (invalidMarket) {
    throw createError(`Invalid market focus: ${invalidMarket}`);
  }

  const allowedIndices = getMarketIndicesForCountry(country);
  const invalidIndex = expertiseIndeces.find((index) => !allowedIndices.includes(index));
  if (invalidIndex) {
    throw createError(`${invalidIndex} is not a valid expertise index for ${country}`);
  }

  if (!data.about?.trim()) {
    throw createError("About is required");
  }

  return {
    country,
    state: country === "India" ? state : undefined,
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

  if (profile.country !== "India") {
    update.$unset.state = "";
  }

  const application = await AdvisorApplication.findOneAndUpdate(
    { user: userId, status: "pending" },
    update,
    {
      new: true,
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
  const filter = {
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  };

  if (query.country) {
    filter["advisorProfile.country"] = query.country.trim();
  }

  if (query.state) {
    filter["advisorProfile.state"] = query.state.trim();
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    advisors: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdvisorOptions = () => ({
  countries: COUNTRIES,
  indianStates: INDIAN_STATES,
  markets: MARKETS,
  marketIndicesByCountry: MARKET_INDICES_BY_COUNTRY,
});
