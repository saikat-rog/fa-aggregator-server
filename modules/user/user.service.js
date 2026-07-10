import User from "../../models/user.model.js";
import { getLocationFromPincode } from "../../common/services/location.service.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureAdvisorExists = async (advisorId) => {
  const advisor = await User.findOne({
    _id: advisorId,
    roles: "advisor",
    "advisorProfile.verificationStatus": "approved",
  }).select("_id");

  if (!advisor) {
    throw createError("Advisor not found", 404);
  }

  return advisor;
};

const sanitizeAdvisor = (advisor) => {
  if (!advisor) return null;
  const profile = advisor.advisorProfile || {};
  const { analytics, verificationStatus, ...publicProfile } = profile;

  return {
    id: advisor._id,
    name: advisor.name || null,
    username: publicProfile.username || null,
    ...publicProfile,
  };
};

export const saveAdvisor = async ({ userId, advisorId }) => {
  await ensureAdvisorExists(advisorId);

  await User.updateOne(
    { _id: userId },
    { $addToSet: { savedAdvisors: advisorId } },
  );

  return { msg: "Advisor saved successfully" };
};

export const unsaveAdvisor = async ({ userId, advisorId }) => {
  await User.updateOne(
    { _id: userId },
    { $pull: { savedAdvisors: advisorId } },
  );

  return { msg: "Advisor unsaved successfully" };
};

export const listSavedAdvisors = async ({ userId }) => {
  const user = await User.findById(userId)
    .populate({
      path: "savedAdvisors",
      select: "name advisorProfile roles",
      match: {
        roles: "advisor",
        "advisorProfile.verificationStatus": "approved",
      },
    })
    .lean();

  const savedAdvisors = (user?.savedAdvisors || [])
    .map((advisor) => sanitizeAdvisor(advisor))
    .filter(Boolean);

  return {
    savedAdvisors,
  };
};

export const updateApproxLocationByPincode = async ({ userId, pincode }) => {
  const approxLocation = await getLocationFromPincode(pincode);
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { approxLocation } },
    { new: true, runValidators: true },
  ).select("approxLocation");

  if (!user) {
    throw createError("User not found", 404);
  }

  return {
    msg: "Location updated successfully",
    approxLocation: user.approxLocation,
  };
};
