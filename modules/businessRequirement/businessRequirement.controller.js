import * as businessRequirementService from "./businessRequirement.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 400).json({ msg: error.message || "Something went wrong" });
};

export const submitBusinessRequirement = async (req, res) => {
  try {
    const data = await businessRequirementService.submitBusinessRequirement(req.body);
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
    const data = await businessRequirementService.listApprovedBusinessRequirements(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
