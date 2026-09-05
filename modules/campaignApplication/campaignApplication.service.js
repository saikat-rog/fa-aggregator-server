import CampaignApplication from "../../models/campaignApplication.model.js";
import BusinessRequirement from "../../models/businessRequirement.model.js";
import User from "../../models/user.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

export const submitCampaignApplication = async ({ campaignId, applicantUser, message }) => {
  if (!applicantUser) {
    throw createError("Please log in to apply for campaigns", 401);
  }

  const isApprovedAdvisor = applicantUser.advisorProfile?.verificationStatus === "approved";
  if (!isApprovedAdvisor) {
    throw createError("Only approved advisors can apply to campaigns", 403);
  }

  if (!message || !message.trim()) {
    throw createError("Application message is required");
  }

  const campaign = await BusinessRequirement.findById(campaignId);
  if (!campaign) {
    throw createError("Campaign not found", 404);
  }

  const applicantName =
    applicantUser.name?.trim() ||
    applicantUser.advisorProfile?.username ||
    applicantUser.email?.split("@")[0] ||
    "Approved Advisor";
  const applicantEmail = applicantUser.email?.trim().toLowerCase();

  const application = await CampaignApplication.create({
    campaign: campaign._id,
    campaignOwner: campaign.advisorId,
    applicant: applicantUser._id,
    applicantName,
    applicantEmail,
    message: message.trim(),
    status: "pending",
  });

  return {
    msg: "Application submitted successfully! The campaign manager will review your proposal in their dashboard.",
    application,
  };
};

export const listOwnerReceivedApplications = async ({ ownerUserId, query = {} }) => {
  const { page, limit, skip } = getPagination(query);

  const filter = { campaignOwner: ownerUserId };
  if (query.status && ["pending", "responded"].includes(query.status)) {
    filter.status = query.status;
  }
  if (query.campaignId) {
    filter.campaign = query.campaignId;
  }

  const [applications, total] = await Promise.all([
    CampaignApplication.find(filter)
      .populate("campaign", "companyName storeUsername category campaignGoal rewardType budget")
      .populate("applicant", "name email advisorProfile.username advisorProfile.instagramProfilePictureUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CampaignApplication.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markApplicationResponded = async ({ ownerUserId, applicationId }) => {
  const application = await CampaignApplication.findOne({
    _id: applicationId,
    campaignOwner: ownerUserId,
  });

  if (!application) {
    throw createError("Campaign application not found or unauthorized", 404);
  }

  application.status = "responded";
  application.respondedAt = new Date();
  await application.save();

  return {
    msg: "Application marked as responded",
    application,
  };
};

export const listAdminCampaignApplications = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status && ["pending", "responded"].includes(query.status)) {
    filter.status = query.status;
  }

  const [applications, total] = await Promise.all([
    CampaignApplication.find(filter)
      .populate("campaign", "companyName storeUsername category campaignGoal")
      .populate("campaignOwner", "name email")
      .populate("applicant", "name email advisorProfile.username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CampaignApplication.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
