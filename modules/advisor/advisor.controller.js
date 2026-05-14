import * as advisorService from "./advisor.service.js";
import * as enquiryService from "../enquiry/enquiry.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json({ msg: error.message || "Something went wrong" });
};

export const submitApplication = async (req, res) => {
  try {
    const data = await advisorService.submitApplication(req.user._id, req.body);
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getMyLatestApplication = async (req, res) => {
  try {
    const data = await advisorService.getMyLatestApplication(req.user._id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listApprovedAdvisors = async (req, res) => {
  try {
    const data = await advisorService.listApprovedAdvisors(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getAdvisorByUsername = async (req, res) => {
  try {
    const data = await advisorService.getAdvisorByUsername(req.params);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const getAdvisorOptions = async (req, res) => {
  try {
    const data = await advisorService.getAdvisorOptions();
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const checkAdvisorUsernameAvailability = async (req, res) => {
  try {
    const data = await advisorService.checkAdvisorUsernameAvailability(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};


export const getProfileAnalytics = async (req, res) => {
  try {
    const data = await advisorService.getProfileAnalytics(req.user._id);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const trackAdvisorClick = async (req, res) => {
  try {
    const data = await advisorService.trackAdvisorClick(req.params.advisorId, req.body);
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listMyEnquiries = async (req, res) => {
  try {
    const data = await enquiryService.listAdvisorEnquiries({
      advisorId: req.user._id,
      query: req.query,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const markMyEnquiryResponded = async (req, res) => {
  try {
    const data = await enquiryService.markEnquiryResponded({
      advisorId: req.user._id,
      enquiryId: req.params.enquiryId,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
