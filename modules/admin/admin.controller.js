import * as adminService from "./admin.service.js";

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
    expiresIn: data.expiresIn
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
