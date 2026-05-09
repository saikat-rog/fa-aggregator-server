import User from "../user/user.model.js";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";

const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage
  };
};

const listByRole = async (role, paginationOptions) => {
  const { page, limit, skip } = getPagination(paginationOptions);
  const filter = { roles: role };

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const login = async (data) => {
  const { email, password } = data;

  if (email !== env.adminEmail) {
    throw new Error("Invalid admin email");
  }

  if (password !== env.adminPassword) {
    throw new Error("Invalid admin password");
  }

  const accessToken = jwt.sign(
    { role: "admin", type: "access" },
    env.jwtSecret,
    { expiresIn: env.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { role: "admin", type: "refresh" },
    env.jwtSecret,
    { expiresIn: env.refreshTokenExpiry }
  );

  global.refreshTokens = global.refreshTokens || {};
  global.refreshTokens[refreshToken] = { role: "admin", createdAt: Date.now() };

  return {
    accessToken,
    refreshToken,
    role: "admin",
    expiresIn: "20m"
  };
};

export const listUsers = async (paginationOptions) => {
  const { items, pagination } = await listByRole("user", paginationOptions);

  return {
    users: items,
    pagination
  };
};

export const listAdvisors = async (paginationOptions) => {
  const { items, pagination } = await listByRole("advisor", paginationOptions);

  return {
    advisors: items,
    pagination
  };
};
