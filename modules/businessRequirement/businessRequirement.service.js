import BusinessRequirement from "../../models/businessRequirement.model.js";
import RequirementClick from "../../models/requirementClick.model.js";

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

const normalizePayload = (data = {}) => ({
  companyName: data.companyName?.trim(),
  businessEmail: data.businessEmail?.trim().toLowerCase(),
  url: data.url?.trim() || undefined,
  currentMonthlySales: data.currentMonthlySales?.toString()?.trim(),
  goalMonthlySales: data.goalMonthlySales?.toString()?.trim(),
  desiredInfluencerScope: data.desiredInfluencerScope?.trim(),
  campaignObjective: data.campaignObjective?.trim(),
  detailedRequirements: data.detailedRequirements?.trim(),
});

const ensureValidUrl = (value) => {
  if (!value) throw createError("URL is required");

  try {
    const parsedUrl = new URL(value);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    return parsedUrl.toString();
  } catch {
    throw createError("URL must be a valid HTTP or HTTPS URL");
  }
};

const ensureNonEmptyText = (value, label) => {
  if (!value) {
    throw createError(`${label} is required`);
  }
  if (value.length > 120) {
    throw createError(`${label} must be 120 characters or less`);
  }
  return value;
};

export const submitBusinessRequirement = async (data = {}, advisorUser) => {
  if (!advisorUser) {
    throw createError("Only logged in advisors can post business requirements", 403);
  }

  const payload = normalizePayload(data);

  if (!payload.companyName) throw createError("Company name is required");
  if (!payload.businessEmail) throw createError("Business email is required");
  if (!payload.desiredInfluencerScope) throw createError("Desired influencer scope is required");
  if (!payload.campaignObjective) throw createError("Campaign objective is required");
  if (!payload.detailedRequirements) throw createError("Detailed requirements are required");

  payload.currentMonthlySales = ensureNonEmptyText(payload.currentMonthlySales, "Current monthly sales");
  payload.goalMonthlySales = ensureNonEmptyText(payload.goalMonthlySales, "Goal monthly sales");
  payload.url = ensureValidUrl(payload.url);

  payload.advisorId = advisorUser._id;
  payload.postedByAdvisorName = advisorUser.name || "Advisor";
  payload.postedByAdvisorUsername = advisorUser.advisorProfile?.username || "";

  const requirement = await BusinessRequirement.create(payload);

  return {
    msg: "Requirement submitted successfully",
    requirement,
  };
};

export const listBusinessRequirements = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = ["pending", "approved"].includes(query.status)
    ? { status: query.status }
    : {};

  const [items, total] = await Promise.all([
    BusinessRequirement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BusinessRequirement.countDocuments(filter),
  ]);

  return {
    requirements: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const approveBusinessRequirement = async (id) => {
  const requirement = await BusinessRequirement.findByIdAndUpdate(
    id,
    { status: "approved", approvedAt: new Date() },
    { new: true, runValidators: true },
  ).lean();

  if (!requirement) throw createError("Requirement not found", 404);

  return { msg: "Requirement approved successfully", requirement };
};

export const listApprovedBusinessRequirements = async (query = {}, requesterUser = null, requesterRole = null) => {
  const { page, limit, skip } = getPagination(query);
  const filter = { status: "approved" };

  const isUserRole = requesterRole === "user" && Boolean(requesterUser);

  const [items, total] = await Promise.all([
    BusinessRequirement.find(filter)
      .select("-businessEmail -__v")
      .sort({ approvedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BusinessRequirement.countDocuments(filter),
  ]);

  // Strip resource url if the requester is not a logged in user
  const sanitizedItems = items.map((item) => {
    if (!isUserRole) {
      const { url, ...rest } = item;
      return { ...rest, isUrlProtected: true };
    }
    return item;
  });

  return {
    requirements: sanitizedItems,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getBusinessRequirementById = async (id) => {
  const requirement = await BusinessRequirement.findById(id).lean();

  if (!requirement) {
    throw createError("Requirement not found", 404);
  }

  return { requirement };
};

export const trackRequirementClick = async ({ id, user }) => {
  if (!user) {
    throw createError("Only logged in users can access resource links", 401);
  }

  const requirement = await BusinessRequirement.findById(id).lean();
  if (!requirement) {
    throw createError("Requirement not found", 404);
  }

  if (requirement.status !== "approved") {
    throw createError("Requirement is not approved", 400);
  }

  const click = await RequirementClick.create({
    requirementId: requirement._id,
    companyName: requirement.companyName,
    url: requirement.url,
    advisorId: requirement.advisorId,
    advisorName: requirement.postedByAdvisorName || "Advisor",
    advisorUsername: requirement.postedByAdvisorUsername || "",
    userId: user._id,
    userName: user.name || "User",
    userEmail: user.email,
    clickedAt: new Date(),
  });

  return {
    msg: "Click logged successfully",
    url: requirement.url,
    click,
  };
};

export const listRequirementClicks = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    RequirementClick.find({})
      .sort({ clickedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RequirementClick.countDocuments({}),
  ]);

  return {
    clicks: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
