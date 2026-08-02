import * as adminService from "./admin.service.js";
import * as enquiryService from "../enquiry/enquiry.service.js";

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const login = async (req, res) => {
  const data = await adminService.login(req.body);
  res.cookie("refreshToken", data.refreshToken, getRefreshCookieOptions());

  res.json({
    accessToken: data.accessToken,
    role: data.role,
  });
};

export const listUsers = async (req, res) => {
  const data = await adminService.listUsers(req.query);
  res.json(data);
};

export const listAdvisors = async (req, res) => {
  const data = await adminService.listAdvisors(req.query);
  res.json(data);
};

export const getAdvisorDetails = async (req, res) => {
  const data = await adminService.getAdvisorDetails(req.params.userId);
  res.json(data);
};

export const removeAdvisorProfile = async (req, res) => {
  const data = await adminService.removeAdvisorProfile(req.params.userId);
  res.json(data);
};

export const listAdvisorApplications = async (req, res) => {
  const data = await adminService.listAdvisorApplications(req.query);
  res.json(data);
};

export const updateAdvisorApplication = async (req, res) => {
  const data = await adminService.updateAdvisorApplication(req.params.id, req.body);
  res.json(data);
};

export const approveAdvisorApplication = async (req, res) => {
  const data = await adminService.approveAdvisorApplication(req.params.id);
  res.json(data);
};

export const rejectAdvisorApplication = async (req, res) => {
  const data = await adminService.rejectAdvisorApplication(req.params.id, req.body);
  res.json(data);
};

export const listIndustries = async (req, res) => {
  const data = await adminService.listIndustries();
  res.json(data);
};

export const addIndustry = async (req, res) => {
  const data = await adminService.addIndustry(req.body);
  res.status(201).json(data);
};

export const listCategories = async (req, res) => {
  const data = await adminService.listCategories();
  res.json(data);
};

export const addCategory = async (req, res) => {
  const data = await adminService.addCategory(req.body);
  res.status(201).json(data);
};

export const listAdvisorEnquiries = async (req, res) => {
  const data = await enquiryService.listAdvisorEnquiries({
    advisorId: req.params.advisorId,
    query: req.query,
  });
  res.json(data);
};
