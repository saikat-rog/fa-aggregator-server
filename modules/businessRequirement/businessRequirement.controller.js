import * as businessRequirementService from "./businessRequirement.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 400).json({ msg: error.message || "Something went wrong" });
};

export const checkStoreUsernameAvailability = async (req, res) => {
  try {
    const data = await businessRequirementService.checkStoreUsernameAvailability(
      req.query,
      req.user?._id,
    );
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const submitBusinessRequirement = async (req, res) => {
  try {
    const data = await businessRequirementService.submitBusinessRequirement(req.body, req.user);
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listBusinessRequirementsAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.listBusinessRequirements(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getBusinessRequirementByIdAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.getBusinessRequirementById(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const approveBusinessRequirementAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.approveBusinessRequirement(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listApprovedBusinessRequirements = async (req, res) => {
  try {
    const data = await businessRequirementService.listApprovedBusinessRequirements(
      req.query,
      req.user,
      req.selectedRole,
    );
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getApprovedBusinessRequirementById = async (req, res) => {
  try {
    const data = await businessRequirementService.getApprovedBusinessRequirementById({
      id: req.params.id,
      requesterUser: req.user,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const trackRequirementClick = async (req, res) => {
  try {
    const data = await businessRequirementService.trackRequirementClick({
      id: req.params.id,
      user: req.user,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listRequirementClicksAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.listRequirementClicks(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getMyRequirement = async (req, res) => {
  try {
    const data = await businessRequirementService.getMyRequirement(req.user);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateMyRequirement = async (req, res) => {
  try {
    const data = await businessRequirementService.updateMyRequirement(req.body, req.user);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const approveRequirementEditAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.approveRequirementEdit(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const rejectRequirementEditAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.rejectRequirementEdit(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteBusinessRequirementAdmin = async (req, res) => {
  try {
    const data = await businessRequirementService.deleteBusinessRequirementAdmin(req.params.id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listMyRequirementClicks = async (req, res) => {
  try {
    const data = await businessRequirementService.listMyRequirementClicks(req.user._id, req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

