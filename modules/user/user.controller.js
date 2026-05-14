import * as enquiryService from "../enquiry/enquiry.service.js";
import * as userService from "./user.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json({ msg: error.message || "Something went wrong" });
};

export const submitAdvisorEnquiry = async (req, res) => {
  try {
    const data = await enquiryService.submitEnquiry({
      advisorId: req.params.advisorId,
      userId: req.user._id,
      data: req.body,
    });
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listMyEnquiries = async (req, res) => {
  try {
    const data = await enquiryService.listUserSubmittedEnquiries({
      userId: req.user._id,
      query: req.query,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const saveAdvisor = async (req, res) => {
  try {
    const data = await userService.saveAdvisor({
      userId: req.user._id,
      advisorId: req.params.advisorId,
    });
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const unsaveAdvisor = async (req, res) => {
  try {
    const data = await userService.unsaveAdvisor({
      userId: req.user._id,
      advisorId: req.params.advisorId,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listSavedAdvisors = async (req, res) => {
  try {
    const data = await userService.listSavedAdvisors({
      userId: req.user._id,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
