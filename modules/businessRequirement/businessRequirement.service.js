import mongoose from "mongoose";
import BusinessRequirement from "../../models/businessRequirement.model.js";
import RequirementClick from "../../models/requirementClick.model.js";
import User from "../../models/user.model.js";

const STORE_USERNAME_REGEX = /^[a-z0-9._]+$/;

const normalizeStoreUsername = (value) => value?.trim().toLowerCase();

const validateStoreUsernameOrThrow = (storeUsername) => {
  if (!storeUsername) {
    throw createError("Store username is required");
  }
  if (storeUsername.length < 3 || storeUsername.length > 30) {
    throw createError("Store username must be between 3 and 30 characters");
  }
  if (!STORE_USERNAME_REGEX.test(storeUsername)) {
    throw createError(
      "Store username can contain lowercase letters, numbers, dots and underscores only",
    );
  }
};

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
  storeUsername: data.storeUsername ? normalizeStoreUsername(data.storeUsername) : (data.username ? normalizeStoreUsername(data.username) : undefined),
  businessEmail: data.businessEmail?.trim().toLowerCase(),
  url: data.url?.trim() || undefined,
  campaignGoal: data.campaignGoal?.trim(),
  budget: data.budget?.toString()?.trim(),
  currentMonthlySales: data.currentMonthlySales?.toString()?.trim(),
  goalMonthlySales: data.goalMonthlySales?.toString()?.trim(),
  desiredInfluencerScope: data.desiredInfluencerScope?.trim(),
  campaignObjective: data.campaignObjective?.trim(),
  detailedRequirements: data.detailedRequirements?.trim(),
});

export const checkStoreUsernameAvailability = async (query = {}, currentAdvisorId = null) => {
  const rawUsername = query.storeUsername || query.username;
  const storeUsername = normalizeStoreUsername(rawUsername);
  validateStoreUsernameOrThrow(storeUsername);

  const filter = { storeUsername };
  if (currentAdvisorId) {
    filter.advisorId = { $ne: currentAdvisorId };
  }

  const taken = await BusinessRequirement.exists(filter);
  return {
    msg: taken ? "Store username not available" : "Store username available",
    available: !taken,
    isAvailable: !taken,
    isTaken: Boolean(taken),
  };
};

const ensureValidUrl = (value) => {
  let trimmed = String(value || "").trim();
  if (!trimmed) throw createError("URL is required");

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname.includes(".")) {
      throw new Error();
    }
    return parsedUrl.toString();
  } catch {
    throw createError("URL must be a valid website or landing page link (e.g., www.example.com or https://example.com)");
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

const enrichRequirementsWithAdvisorInfo = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return items;

  const advisorIds = [...new Set(items.map((item) => item.advisorId).filter(Boolean))];
  let advisorMap = {};
  if (advisorIds.length > 0) {
    const advisors = await User.find({ _id: { $in: advisorIds } })
      .select("name email advisorProfile.username advisorProfile.instagramProfilePictureUrl advisorProfile.socialLinks")
      .lean();
    advisorMap = Object.fromEntries(advisors.map((a) => [String(a._id), a]));
  }

  return items.map((item) => {
    const advisor = item.advisorId ? advisorMap[String(item.advisorId)] : null;
    const instagramProfilePictureUrl = advisor?.advisorProfile?.instagramProfilePictureUrl || null;
    const postedByAdvisorName =
      advisor?.name?.trim() || advisor?.advisorProfile?.username || advisor?.email?.split("@")[0] || item.postedByAdvisorName || "User";
    const postedByAdvisorUsername = advisor?.advisorProfile?.username || item.postedByAdvisorUsername || "";
    const socialLinks = item.socialLinks || advisor?.advisorProfile?.socialLinks || {};

    return {
      ...item,
      postedByAdvisorName,
      postedByAdvisorUsername,
      instagramProfilePictureUrl,
      socialLinks,
    };
  });
};

export const submitBusinessRequirement = async (data = {}, user) => {
  if (!user) {
    throw createError("Please log in to post requirements", 401);
  }

  const isAdvisorRole = Array.isArray(user.roles) ? user.roles.includes("advisor") : user.role === "advisor";
  if (isAdvisorRole) {
    const isApprovedAdvisor = user.advisorProfile?.verificationStatus === "approved";
    if (!isApprovedAdvisor) {
      throw createError("You have to be approved by Admin", 403);
    }
  }

  const reqType = data.type === "campaign" || (!isAdvisorRole && data.type !== "store") ? "campaign" : "store";
  if (reqType === "store") {
    const existing = await BusinessRequirement.findOne({ advisorId: user._id, type: "store" }).lean();
    if (existing) {
      throw createError("Store applications cannot be submitted multiple times.", 400);
    }
  }

  const payload = normalizePayload(data);

  if (!payload.companyName) throw createError("Company name is required");
  validateStoreUsernameOrThrow(payload.storeUsername);
  const usernameTaken = await BusinessRequirement.exists({ storeUsername: payload.storeUsername });
  if (usernameTaken) {
    throw createError("Store username is already taken. Please choose another.", 409);
  }

  if (!payload.businessEmail) throw createError("Business email is required");
  if (!payload.detailedRequirements) throw createError("Detailed requirements are required");

  payload.url = ensureValidUrl(payload.url);
  payload.socialLinks = user.advisorProfile?.socialLinks || {};

  payload.advisorId = user._id;
  payload.type = isAdvisorRole ? "store" : "campaign";
  const resolvedName = user.name?.trim() || user.advisorProfile?.username || user.email?.split("@")[0] || (isAdvisorRole ? "Advisor" : "User");
  payload.postedByAdvisorName = resolvedName;
  payload.postedByAdvisorUsername = user.advisorProfile?.username || "";

  const requirement = await BusinessRequirement.create(payload);

  return {
    msg: isAdvisorRole ? "Store requirement submitted successfully" : "Campaign requirement submitted successfully",
    requirement,
  };
};

export const getMyRequirement = async (user) => {
  if (!user) {
    throw createError("Not authorized", 401);
  }
  const requirement = await BusinessRequirement.findOne({ advisorId: user._id }).lean();
  if (!requirement) {
    return { requirement: null };
  }
  const [enriched] = await enrichRequirementsWithAdvisorInfo([requirement]);
  return { requirement: enriched };
};

export const updateMyRequirement = async (data = {}, user) => {
  if (!user) {
    throw createError("Not authorized", 401);
  }
  const isAdvisorRole = Array.isArray(user.roles) ? user.roles.includes("advisor") : user.role === "advisor";
  if (isAdvisorRole) {
    const isApprovedAdvisor = user.advisorProfile?.verificationStatus === "approved";
    if (!isApprovedAdvisor) {
      throw createError("You have to be approved by Admin", 403);
    }
  }

  const requirement = await BusinessRequirement.findOne({ advisorId: user._id });
  if (!requirement) {
    throw createError("Requirement not found. Please submit a requirement first.", 404);
  }

  const payload = normalizePayload(data);

  if (!payload.companyName) throw createError("Company name is required");
  validateStoreUsernameOrThrow(payload.storeUsername);
  const usernameTaken = await BusinessRequirement.exists({
    storeUsername: payload.storeUsername,
    _id: { $ne: requirement._id },
  });
  if (usernameTaken) {
    throw createError("Store username is already taken. Please choose another.", 409);
  }

  if (!payload.businessEmail) throw createError("Business email is required");
  if (!payload.detailedRequirements) throw createError("Detailed requirements are required");

  payload.url = ensureValidUrl(payload.url);

  // If current requirement is still pending initial approval, update main fields directly
  if (requirement.status === "pending") {
    Object.assign(requirement, payload);
    requirement.editStatus = "none";
    requirement.pendingEdit = undefined;
    await requirement.save();
    return {
      msg: "Requirement updated successfully",
      requirement,
    };
  }

  // If current requirement is approved (live), store updates in pendingEdit for Admin review
  requirement.pendingEdit = {
    ...payload,
    submittedAt: new Date(),
  };
  requirement.editStatus = "pending";
  await requirement.save();

  return {
    msg: "Your requirement updates have been submitted for Admin approval.",
    requirement,
  };
};

export const listBusinessRequirements = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  let filter = {};
  if (query.status === "pending_edit") {
    filter = { editStatus: "pending" };
  } else if (["pending", "approved"].includes(query.status)) {
    filter = { status: query.status };
  }
  if (query.type && ["store", "campaign"].includes(query.type)) {
    filter.type = query.type;
  }

  const [items, total] = await Promise.all([
    BusinessRequirement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BusinessRequirement.countDocuments(filter),
  ]);

  const enrichedItems = await enrichRequirementsWithAdvisorInfo(items);

  return {
    requirements: enrichedItems,
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

export const approveRequirementEdit = async (id) => {
  const requirement = await BusinessRequirement.findById(id);
  if (!requirement) throw createError("Requirement not found", 404);

  if (requirement.editStatus !== "pending" || !requirement.pendingEdit) {
    throw createError("No pending edit found for this requirement", 400);
  }

  const editData = requirement.pendingEdit.toObject ? requirement.pendingEdit.toObject() : requirement.pendingEdit;
  delete editData._id;
  delete editData.submittedAt;

  Object.assign(requirement, editData);
  requirement.pendingEdit = undefined;
  requirement.editStatus = "none";
  await requirement.save();

  return { msg: "Requirement edit approved and updated live", requirement };
};

export const rejectRequirementEdit = async (id) => {
  const requirement = await BusinessRequirement.findById(id);
  if (!requirement) throw createError("Requirement not found", 404);

  requirement.pendingEdit = undefined;
  requirement.editStatus = "rejected";
  await requirement.save();

  return { msg: "Requirement edit rejected", requirement };
};

export const deleteBusinessRequirementAdmin = async (id) => {
  const requirement = await BusinessRequirement.findByIdAndDelete(id);
  if (!requirement) throw createError("Requirement not found", 404);

  await RequirementClick.deleteMany({ requirementId: id });

  return { msg: "Requirement and associated click history deleted successfully" };
};

export const listApprovedBusinessRequirements = async (query = {}, requesterUser = null, requesterRole = null) => {
  const { page, limit, skip } = getPagination(query);

  const filter = { status: "approved" };
  if (query.type && ["store", "campaign"].includes(query.type)) {
    filter.type = query.type;
  }

  const isAuthorized = Boolean(requesterUser);

  const [items, total] = await Promise.all([
    BusinessRequirement.find(filter)
      .select("-__v")
      .sort({ approvedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BusinessRequirement.countDocuments(filter),
  ]);

  const enrichedItems = await enrichRequirementsWithAdvisorInfo(items);

  // Strip resource url if the requester is not logged in
  const sanitizedItems = enrichedItems.map((item) => {
    if (!isAuthorized) {
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
  let requirement = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    requirement = await BusinessRequirement.findById(id).lean();
  }
  if (!requirement) {
    requirement = await BusinessRequirement.findOne({ storeUsername: id.toLowerCase() }).lean();
  }

  if (!requirement) {
    throw createError("Requirement not found", 404);
  }

  const [enriched] = await enrichRequirementsWithAdvisorInfo([requirement]);

  return { requirement: enriched };
};

export const getApprovedBusinessRequirementById = async ({ id, requesterUser }) => {
  let requirement = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    requirement = await BusinessRequirement.findOne({ _id: id, status: "approved" })
      .select("-businessEmail -__v")
      .lean();
  }
  if (!requirement) {
    requirement = await BusinessRequirement.findOne({ storeUsername: id.toLowerCase(), status: "approved" })
      .select("-businessEmail -__v")
      .lean();
  }

  if (!requirement) {
    throw createError("Approved requirement not found", 404);
  }

  const [enriched] = await enrichRequirementsWithAdvisorInfo([requirement]);

  const isAuthorized = Boolean(requesterUser);
  if (!isAuthorized) {
    const { url, ...rest } = enriched;
    return { requirement: { ...rest, isUrlProtected: true } };
  }

  return { requirement: enriched };
};

export const trackRequirementClick = async ({ id, user }) => {
  let requirement = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    requirement = await BusinessRequirement.findById(id).lean();
  }
  if (!requirement) {
    requirement = await BusinessRequirement.findOne({ storeUsername: id.toLowerCase() }).lean();
  }
  if (!requirement) {
    throw createError("Requirement not found", 404);
  }

  if (requirement.status !== "approved") {
    throw createError("Requirement is not approved", 400);
  }

  let advisorName = requirement.postedByAdvisorName;
  let advisorUsername = requirement.postedByAdvisorUsername;

  if ((!advisorName || advisorName === "Advisor") && requirement.advisorId) {
    const advisor = await User.findById(requirement.advisorId).select("name email advisorProfile.username").lean();
    if (advisor) {
      advisorName = advisor.name?.trim() || advisor.advisorProfile?.username || advisor.email?.split("@")[0] || "Advisor";
      advisorUsername = advisorUsername || advisor.advisorProfile?.username || "";
    }
  }

  const clickPayload = {
    requirementId: requirement._id,
    companyName: requirement.companyName,
    url: requirement.url,
    advisorId: requirement.advisorId,
    advisorName: advisorName || "Advisor",
    advisorUsername: advisorUsername || "",
    userName: user ? (user.name || user.username || (user.role === "admin" ? "Admin" : "User")) : "Guest User",
    userEmail: user ? user.email || null : null,
    clickedAt: new Date(),
  };

  if (user?._id) {
    clickPayload.userId = user._id;
  }

  const click = await RequirementClick.create(clickPayload);

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

  const advisorIds = [...new Set(items.map((item) => item.advisorId).filter(Boolean))];
  let advisorMap = {};
  if (advisorIds.length > 0) {
    const advisors = await User.find({ _id: { $in: advisorIds } }).select("name email advisorProfile.username").lean();
    advisorMap = Object.fromEntries(advisors.map((a) => [String(a._id), a]));
  }

  const enrichedClicks = items.map((click) => {
    let name = click.advisorName;
    let username = click.advisorUsername;
    if ((!name || name === "Advisor") && click.advisorId && advisorMap[String(click.advisorId)]) {
      const adv = advisorMap[String(click.advisorId)];
      name = adv.name?.trim() || adv.advisorProfile?.username || adv.email?.split("@")[0] || "Advisor";
      username = username || adv.advisorProfile?.username || "";
    }
    return {
      ...click,
      advisorName: name || "Advisor",
      advisorUsername: username || "",
    };
  });

  return {
    clicks: enrichedClicks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listMyRequirementClicks = async (advisorId, query = {}) => {
  const { page, limit, skip } = getPagination(query);

  const filter = { advisorId };

  const [items, total] = await Promise.all([
    RequirementClick.find(filter)
      .sort({ clickedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RequirementClick.countDocuments(filter),
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

