import User from "../../models/user.model.js";
import AdvisorApplication from "../../models/advisorApplication.model.js";
import BusinessRequirement from "../../models/businessRequirement.model.js";
import Industry from "../../models/industry.model.js";
import Category from "../../models/category.model.js";
import Market from "../../models/market.model.js";
import ExpertiseIndex from "../../models/expertiseIndex.model.js";
import { LOCATIONS } from "../../common/constants/LOCATIONS.js";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import { createRefreshToken } from "../auth/auth.service.js";
import {
  syncAdvisorSocialMetricsForApproval,
  buildAdvisorSocialProfileSetPayload
} from "../../common/services/advisorSocialSync.service.js";
import {
  buildAdvisorApprovalEmail,
  buildAdvisorRejectionEmail,
  sendTemplatedEmail
} from "../../common/services/mail.service.js";

const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];
const countryNames = Object.keys(LOCATIONS);

const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage
  };
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FOLLOWER_FILTER_FIELDS = [
  "instagramFollowers",
  "youtubeSubscribers",
  "telegramFollowers"
];
const SOCIAL_LINK_FILTER_FIELDS = [
  "instagram",
  "youtube",
  "telegram"
];

const parseCsvValues = (value) => {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      rawValues
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
};
const normalizeIndustry = (value) => value?.trim().toLowerCase();
const normalizeCategory = (value) => {
  const category = typeof value === "string" ? value.trim() : "";
  if (!category) {
    throw new Error("Category is required");
  }

  return category;
};

const sendAdvisorNotificationIfPossible = async ({ to, template }) => {
  try {
    await sendTemplatedEmail({ to, template });
  } catch (error) {
    console.error("Failed to send advisor application email:", error.message);
  }
};

const normalizePpp = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("PPP must be a non-negative number");
  }

  return parsed;
};

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
      ["$lte", lteRaw]
    ];

    const numericOperators = {};
    for (const [operator, raw] of operatorValueEntries) {
      if (raw === undefined) {
        continue;
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        throw new Error(`${field}${operator.replace("$", "")} must be a valid number`);
      }

      numericOperators[operator] = parsed;
    }

    filter[`advisorProfile.${field}`] = numericOperators;
  }
};

const listByRole = async (role, paginationOptions, extraFilter = {}) => {
  const { page, limit, skip } = getPagination(paginationOptions);
  const filter = { roles: role, ...extraFilter };

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const login = async (data) => {
  const { email, password } = data;

  if (email !== env.adminEmail) {
    throw new Error("Invalid admin email");
  }

  if (password !== env.adminPassword) {
    throw new Error("Invalid admin password");
  }

  const accessToken = jwt.sign(
    { role: "admin", type: "access" },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );

  const refreshToken = await createRefreshToken({ role: "admin" });

  return {
    accessToken,
    refreshToken,
    role: "admin",
  };
};

export const listUsers = async (paginationOptions) => {
  const country = paginationOptions?.country?.trim();
  const state = paginationOptions?.state?.trim();
  const approxLocation = paginationOptions?.approxLocation?.trim();
  const filter = {};

  if (country) {
    filter["approxLocation.country"] = country;
  }

  if (state) {
    filter["approxLocation.state"] = state;
  }

  if (approxLocation) {
    const approxLocationRegex = new RegExp(escapeRegex(approxLocation), "i");
    filter.$or = [
      { "approxLocation.country": approxLocationRegex },
      { "approxLocation.state": approxLocationRegex },
      { "approxLocation.pincode": approxLocationRegex }
    ];
  }

  const { items, pagination } = await listByRole("user", paginationOptions, filter);

  return {
    users: items,
    pagination
  };
};

export const listAdvisors = async (paginationOptions) => {
  const country = paginationOptions?.country?.trim();
  const state = paginationOptions?.state?.trim();
  const verificationStatus = paginationOptions?.verificationStatus?.trim();
  const username = paginationOptions?.username?.trim();
  const emailForContact = paginationOptions?.emailForContact?.trim();
  const category = paginationOptions?.category?.trim();
  const filter = {};

  if (country && !countryNames.includes(country)) {
    throw new Error("Valid country is required");
  }

  if (state && !country) {
    throw new Error("Country is required when filtering by state");
  }

  if (country) {
    const statesForCountry = getStatesForCountry(country);

    if (state && statesForCountry.length === 0) {
      throw new Error(`State filter is not supported for ${country}`);
    }

    if (state && !statesForCountry.includes(state)) {
      throw new Error(`Valid state is required for ${country}`);
    }

    filter["advisorProfile.country"] = country;
  }

  if (state) {
    filter["advisorProfile.state"] = state;
  }

  if (verificationStatus) {
    filter["advisorProfile.verificationStatus"] = verificationStatus;
  }

  if (username) {
    filter["advisorProfile.username"] = new RegExp(escapeRegex(username), "i");
  }

  if (emailForContact) {
    filter["advisorProfile.emailForContact"] = new RegExp(escapeRegex(emailForContact), "i");
  }

  if (category) {
    filter["advisorProfile.category"] = new RegExp(escapeRegex(category), "i");
  }

  const industries = parseCsvValues(paginationOptions?.industries);
  if (industries.length > 0) {
    filter["advisorProfile.industries"] = { $in: industries };
  }

  const marketFocus = parseCsvValues(paginationOptions?.marketFocus);
  if (marketFocus.length > 0) {
    filter["advisorProfile.marketFocus"] = { $in: marketFocus };
  }

  const expertiseIndeces = parseCsvValues(paginationOptions?.expertiseIndeces);
  if (expertiseIndeces.length > 0) {
    filter["advisorProfile.expertiseIndeces"] = { $in: expertiseIndeces };
  }

  for (const field of SOCIAL_LINK_FILTER_FIELDS) {
    const value = paginationOptions?.[field]?.trim();
    if (!value) {
      continue;
    }

    filter[`advisorProfile.socialLinks.${field}`] = new RegExp(escapeRegex(value), "i");
  }

  addFollowerFilters(filter, paginationOptions);

  const { page, limit, skip } = getPagination(paginationOptions);
  const [items, total] = await Promise.all([
    User.find({ roles: "advisor", ...filter })
      .select("_id name advisorProfile.username advisorProfile.socialLinks advisorProfile.ppp advisorProfile.category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments({ roles: "advisor", ...filter })
  ]);

  return {
    advisors: items.map((item) => ({
      id: item._id,
      name: item?.name || null,
      username: item?.advisorProfile?.username || null,
      ppp: item?.advisorProfile?.ppp ?? null,
      category: item?.advisorProfile?.category || null,
      profilePictureUrl: item?.advisorProfile?.instagramProfilePictureUrl || null
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getAdvisorDetails = async (userId) => {
  if (!userId?.trim()) {
    throw new Error("userId is required");
  }

  const advisor = await User.findOne({ _id: userId.trim(), roles: "advisor" })
    .select("-password");

  if (!advisor) {
    throw new Error("Advisor not found");
  }

  return {
    name: advisor?.name || null,
    username: advisor?.advisorProfile?.username || null,
    advisorProfile: advisor?.advisorProfile || null
  };
};

export const removeAdvisorProfile = async (userId) => {
  if (!userId?.trim()) {
    throw new Error("userId is required");
  }

  const normalizedUserId = userId.trim();
  const user = await User.findOne({ _id: normalizedUserId, roles: "advisor" });

  if (!user) {
    throw new Error("Advisor not found");
  }

  const nextRoles = (Array.isArray(user.roles) ? user.roles : []).filter(
    (role) => role !== "advisor"
  );

  user.roles = nextRoles.length > 0 ? nextRoles : ["user"];
  user.advisorProfile = undefined;
  await Promise.all([
    user.save(),
    BusinessRequirement.deleteMany({ advisorId: normalizedUserId }),
    AdvisorApplication.updateMany(
      {
        user: normalizedUserId,
        status: { $in: ["pending", "approved"] }
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: "Advisor profile removed by admin",
          reviewedAt: new Date()
        }
      },
      { runValidators: true }
    )
  ]);

  return {
    msg: "Advisor profile removed",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles
    }
  };
};

export const listAdvisorApplications = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  const [items, total] = await Promise.all([
    AdvisorApplication.find(filter)
      .populate("user", "name email roles advisorProfile")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdvisorApplication.countDocuments(filter)
  ]);

  return {
    applications: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const updateAdvisorApplication = async (applicationId, data = {}) => {
  const application = await AdvisorApplication.findById(applicationId);

  if (!application) {
    throw new Error("Advisor application not found");
  }

  if (application.status !== "pending") {
    throw new Error("Only pending advisor applications can be edited");
  }

  const allowedFields = [
    "username",
    "pincode",
    "industries",
    "country",
    "state",
    "socialLinks",
    "about",
    "marketFocus",
    "expertiseIndeces",
    "emailForContact",
    "personalWebsite",
    "ppp",
    "category"
  ];

  const hasChanges = allowedFields.some((field) => data[field] !== undefined);
  if (!hasChanges) {
    throw new Error("No editable fields provided");
  }

  const updatePayload = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updatePayload[field] = data[field];
    }
  }

  if (typeof updatePayload.username === "string") {
    updatePayload.username = updatePayload.username.trim().toLowerCase();
  }

  if (typeof updatePayload.pincode === "string") {
    updatePayload.pincode = updatePayload.pincode.trim();
  }

  if (typeof updatePayload.about === "string") {
    updatePayload.about = updatePayload.about.trim();
  }

  if (typeof updatePayload.country === "string") {
    updatePayload.country = updatePayload.country.trim();
  }

  if (typeof updatePayload.state === "string") {
    updatePayload.state = updatePayload.state.trim();
  }

  if (typeof updatePayload.emailForContact === "string") {
    updatePayload.emailForContact = updatePayload.emailForContact.trim().toLowerCase();
  }

  if (typeof updatePayload.personalWebsite === "string") {
    updatePayload.personalWebsite = updatePayload.personalWebsite.trim();
  }

  if (updatePayload.ppp !== undefined) {
    updatePayload.ppp = normalizePpp(updatePayload.ppp);
  }

  if (updatePayload.category !== undefined) {
    updatePayload.category = normalizeCategory(updatePayload.category);
  }

  if (updatePayload.industries !== undefined) {
    const industriesInput = Array.isArray(updatePayload.industries)
      ? updatePayload.industries
      : [updatePayload.industries];
    const normalizedIndustries = [
      ...new Set(
        industriesInput
          .map((value) => normalizeIndustry(value))
          .filter(Boolean)
      )
    ];

    if (normalizedIndustries.length === 0) {
      throw new Error("At least one industry is required");
    }

    const matchedIndustries = await Industry.find({
      industryCode: { $in: normalizedIndustries }
    }).select("name industryCode");

    if (matchedIndustries.length !== normalizedIndustries.length) {
      throw new Error("One or more selected industries are not available");
    }

    const industriesByCode = new Map(
      matchedIndustries.map((item) => [item.industryCode, item.name])
    );

    updatePayload.industries = normalizedIndustries.map(
      (industryCode) => industriesByCode.get(industryCode)
    );
  }

  if (updatePayload.marketFocus !== undefined) {
    const marketsInput = Array.isArray(updatePayload.marketFocus)
      ? updatePayload.marketFocus
      : [updatePayload.marketFocus];
    if (marketsInput.length > 0) {
      const matchedMarkets = await Market.find({
        name: { $in: marketsInput }
      }).select("name");
      const validNames = new Set(matchedMarkets.map((m) => m.name));
      const invalid = marketsInput.find((m) => !validNames.has(m));
      if (invalid) {
        throw new Error(`Invalid market focus: ${invalid}`);
      }
    }
    updatePayload.marketFocus = marketsInput;
  }

  if (updatePayload.expertiseIndeces !== undefined) {
    const indicesInput = Array.isArray(updatePayload.expertiseIndeces)
      ? updatePayload.expertiseIndeces
      : [updatePayload.expertiseIndeces];
    if (indicesInput.length > 0) {
      const matchedIndices = await ExpertiseIndex.find({
        name: { $in: indicesInput }
      }).select("name");
      const validNames = new Set(matchedIndices.map((i) => i.name));
      const invalid = indicesInput.find((i) => !validNames.has(i));
      if (invalid) {
        throw new Error(`Invalid expertise index: ${invalid}`);
      }
    }
    updatePayload.expertiseIndeces = indicesInput;
  }

  const nextCountry = updatePayload.country ?? application.country;
  const nextState = updatePayload.state ?? application.state;
  const statesForCountry = getStatesForCountry(nextCountry);

  if (statesForCountry.length > 0) {
    if (!nextState || !statesForCountry.includes(nextState)) {
      throw new Error(`Valid state is required when country is ${nextCountry}`);
    }
  } else if (updatePayload.state !== undefined) {
    updatePayload.state = undefined;
  }

  const updatedApplication = await AdvisorApplication.findByIdAndUpdate(
    applicationId,
    {
      $set: updatePayload
    },
    {
      returnDocument: "after",
      runValidators: true
    }
  );

  return {
    msg: "Advisor application updated",
    application: updatedApplication
  };
};

export const approveAdvisorApplication = async (applicationId) => {
  const application = await AdvisorApplication.findById(applicationId);

  if (!application) {
    throw new Error("Advisor application not found");
  }

  if (application.status !== "pending") {
    throw new Error("Only pending advisor applications can be approved");
  }

  const user = await User.findById(application.user);
  if (!user) {
    throw new Error("Application user not found");
  }

  let socialMetrics;
  try {
    socialMetrics = await syncAdvisorSocialMetricsForApproval({
      socialLinks: application.socialLinks || {}
    });
  } catch (error) {
    application.status = "pending";
    application.reviewedAt = undefined;
    await application.save();
    throw new Error(
      `Approval failed because SocialFetch did not succeed after retries: ${error.message}`
    );
  }

  const socialSetPayload = buildAdvisorSocialProfileSetPayload(socialMetrics);
  const socialProfileValues = Object.fromEntries(
    Object.entries(socialSetPayload)
      .map(([key, value]) => [key.replace("advisorProfile.", ""), value])
  );

  user.roles = [...new Set([...(Array.isArray(user.roles) ? user.roles : []), "advisor"])];
  user.advisorProfile = {
    username: application.username,
    pincode: application.pincode,
    industries: application.industries,
    country: application.country,
    state: getStatesForCountry(application.country).length > 0 ? application.state : undefined,
    verificationStatus: "approved",
    socialLinks: application.socialLinks,
    about: application.about,
    marketFocus: application.marketFocus,
    expertiseIndeces: application.expertiseIndeces,
    emailForContact: application.emailForContact,
    personalWebsite: application.personalWebsite,
    ppp: application.ppp,
    category: application.category,
    ...socialProfileValues
  };

  application.instagramFollowers = socialProfileValues.instagramFollowers;
  application.instagramEngagementRateScore = socialProfileValues.instagramEngagementRateScore;
  application.youtubeSubscribers = socialProfileValues.youtubeSubscribers;
  application.telegramFollowers = socialProfileValues.telegramFollowers;
  if (socialProfileValues.about) {
    application.about = socialProfileValues.about;
  }

  application.status = "approved";
  application.rejectionReason = undefined;
  application.reviewedAt = new Date();

  await Promise.all([user.save(), application.save()]);
  await sendAdvisorNotificationIfPossible({
    to: user.email,
    template: buildAdvisorApprovalEmail({
      name: user.name,
      username: application.username
    })
  });

  return {
    msg: "Advisor application approved",
    application
  };
};

export const rejectAdvisorApplication = async (applicationId, data = {}) => {
  const rejectionReason = data.rejectionReason?.trim();

  if (!rejectionReason) {
    throw new Error("Rejection remarks are required");
  }

  const application = await AdvisorApplication.findById(applicationId);

  if (!application) {
    throw new Error("Advisor application not found");
  }

  if (application.status !== "pending") {
    throw new Error("Only pending advisor applications can be rejected");
  }

  const user = await User.findById(application.user);
  if (user) {
    user.advisorProfile = {
      ...(user.advisorProfile?.toObject?.() || user.advisorProfile || {}),
      verificationStatus: "rejected"
    };
    await user.save();
  }

  application.status = "rejected";
  application.rejectionReason = rejectionReason;
  application.reviewedAt = new Date();
  await application.save();

  if (user?.email) {
    await sendAdvisorNotificationIfPossible({
      to: user.email,
      template: buildAdvisorRejectionEmail({
        name: user.name,
        reason: rejectionReason
      })
    });
  }

  return {
    msg: "Advisor application rejected",
    application
  };
};

export const listIndustries = async () => {
  const industries = await Industry.find({})
    .sort({ createdAt: -1 })
    .lean();

  return { industries };
};

export const addIndustry = async (data = {}) => {
  const name = data.name?.trim();
  const industryCode = name?.toLowerCase();

  if (!name) {
    throw new Error("Industry name is required");
  }

  const existing = await Industry.findOne({ industryCode: industryCode });
  if (existing) {
    return { msg: "Industry already exists", industry: existing };
  }

  const industry = await Industry.create({ name, industryCode: industryCode });
  return { msg: "Industry added", industry };
};

export const listCategories = async () => {
  const categories = await Category.find({})
    .sort({ createdAt: -1 })
    .lean();

  return { categories };
};

export const addCategory = async (data = {}) => {
  const name = data.name?.trim();
  const categoryCode = name?.toLowerCase();

  if (!name) {
    throw new Error("Category name is required");
  }

  const existing = await Category.findOne({ categoryCode: categoryCode });
  if (existing) {
    return { msg: "Category already exists", category: existing };
  }

  const category = await Category.create({ name, categoryCode: categoryCode });
  return { msg: "Category added", category };
};

export const listMarkets = async () => {
  const markets = await Market.find({})
    .sort({ createdAt: -1 })
    .lean();

  return { markets };
};

export const addMarket = async (data = {}) => {
  const name = data.name?.trim();
  const marketCode = name?.toLowerCase();

  if (!name) {
    throw new Error("Market name is required");
  }

  const existing = await Market.findOne({ marketCode });
  if (existing) {
    return { msg: "Market already exists", market: existing };
  }

  const market = await Market.create({ name, marketCode });
  return { msg: "Market added", market };
};

export const listExpertiseIndices = async () => {
  const expertiseIndices = await ExpertiseIndex.find({})
    .sort({ createdAt: -1 })
    .lean();

  return { expertiseIndices };
};

export const addExpertiseIndex = async (data = {}) => {
  const name = data.name?.trim();
  const country = data.country?.trim();
  const indexCode = name?.toLowerCase();

  if (!name) {
    throw new Error("Expertise index name is required");
  }

  const existing = await ExpertiseIndex.findOne({ indexCode });
  if (existing) {
    return { msg: "Expertise index already exists", expertiseIndex: existing };
  }

  const expertiseIndex = await ExpertiseIndex.create({ name, indexCode, country });
  return { msg: "Expertise index added", expertiseIndex };
};

