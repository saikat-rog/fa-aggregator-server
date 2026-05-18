import User from "../../models/user.model.js";
import Enquiry from "../../models/enquiry.model.js";

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
  category: data.category?.trim(),
  subject: data.subject?.trim(),
  message: data.message?.trim(),
});

const validatePayload = ({ category, subject, message }) => {
  if (!category) throw createError("Category is required");
  if (!subject) throw createError("Subject is required");
  if (!message) throw createError("Message is required");
};

const ensureAdvisorExists = async (advisorId) => {
  const advisor = await User.findById(advisorId).select(
    "_id name roles advisorProfile.username advisorProfile.verificationStatus",
  );

  if (!advisor) {
    throw createError("Advisor account does not exist", 404);
  }

  const hasAdvisorRole = Array.isArray(advisor.roles) && advisor.roles.includes("advisor");
  if (!hasAdvisorRole) {
    throw createError("Advisor not found", 404);
  }

  const verificationStatus = advisor?.advisorProfile?.verificationStatus;
  if (!verificationStatus) {
    throw createError("Advisor is not approved", 403);
  }

  if (verificationStatus !== "approved") {
    throw createError(
      `Advisor profile is not approved (current status: ${verificationStatus})`,
      403,
    );
  }

  return advisor;
};

export const submitEnquiry = async ({ advisorId, userId, data }) => {
  await ensureAdvisorExists(advisorId);

  const payload = normalizePayload(data);
  validatePayload(payload);

  const enquiry = await Enquiry.create({
    advisor: advisorId,
    submittedBy: userId,
    ...payload,
  });

  await User.updateOne(
    { _id: userId },
    { $addToSet: { savedAdvisors: advisorId } },
  );

  return {
    msg: "Enquiry submitted successfully",
    enquiry,
  };
};

export const listAdvisorEnquiries = async ({ advisorId, query = {} }) => {
  await ensureAdvisorExists(advisorId);
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    Enquiry.find({ advisor: advisorId })
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Enquiry.countDocuments({ advisor: advisorId }),
  ]);

  return {
    enquiries: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markEnquiryResponded = async ({ advisorId, enquiryId }) => {
  await ensureAdvisorExists(advisorId);

  const enquiry = await Enquiry.findOne({
    _id: enquiryId,
    advisor: advisorId,
  });

  if (!enquiry) {
    throw createError("Enquiry not found", 404);
  }

  if (enquiry.status === "responded") {
    return {
      msg: "Enquiry already marked as responded",
      enquiry,
    };
  }

  enquiry.status = "responded";
  enquiry.respondedAt = new Date();
  await enquiry.save();

  return {
    msg: "Enquiry marked as responded",
    enquiry,
  };
};

export const listUserSubmittedEnquiries = async ({ userId, query = {} }) => {
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    Enquiry.find({ submittedBy: userId })
      .populate("advisor", "name advisorProfile.username advisorProfile.emailForContact advisorProfile.personalWebsite")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Enquiry.countDocuments({ submittedBy: userId }),
  ]);

  return {
    enquiries: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
