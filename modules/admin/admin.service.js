import User from "../../models/user.model.js";
import AdvisorApplication from "../../models/advisorApplication.model.js";
import { LOCATIONS } from "../../common/constants/LOCATIONS.js";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";

const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

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

const listByRole = async (role, paginationOptions) => {
  const { page, limit, skip } = getPagination(paginationOptions);
  const filter = { roles: role };

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

  const refreshToken = jwt.sign(
    { role: "admin", type: "refresh" },
    env.jwtSecret,
    { expiresIn: env.refreshTokenExpiry }
  );

  global.refreshTokens = global.refreshTokens || {};
  global.refreshTokens[refreshToken] = { role: "admin", createdAt: Date.now() };

  return {
    accessToken,
    refreshToken,
    role: "admin",
  };
};

export const listUsers = async (paginationOptions) => {
  const { items, pagination } = await listByRole("user", paginationOptions);

  return {
    users: items,
    pagination
  };
};

export const listAdvisors = async (paginationOptions) => {
  const { items, pagination } = await listByRole("advisor", paginationOptions);

  return {
    advisors: items,
    pagination
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

  user.roles = [...new Set([...(Array.isArray(user.roles) ? user.roles : []), "advisor"])];
  user.advisorProfile = {
    country: application.country,
    state: getStatesForCountry(application.country).length > 0 ? application.state : undefined,
    verificationStatus: "approved",
    socialLinks: application.socialLinks,
    about: application.about,
    marketFocus: application.marketFocus,
    expertiseIndeces: application.expertiseIndeces,
    emailForContact: application.emailForContact,
    personalWebsite: application.personalWebsite
  };

  application.status = "approved";
  application.reviewedAt = new Date();

  await Promise.all([user.save(), application.save()]);

  return {
    msg: "Advisor application approved",
    application
  };
};

export const rejectAdvisorApplication = async (applicationId, data = {}) => {
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
  application.rejectionReason = data.rejectionReason?.trim();
  application.reviewedAt = new Date();
  await application.save();

  return {
    msg: "Advisor application rejected",
    application
  };
};
