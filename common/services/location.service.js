import { LOCATIONS } from "../constants/LOCATIONS.js";

const countryNames = Object.keys(LOCATIONS);
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

const indiaRegionCodes = {
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CG: "Chhattisgarh",
  CH: "Chandigarh",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HP: "Himachal Pradesh",
  HR: "Haryana",
  JH: "Jharkhand",
  JK: "Jammu and Kashmir",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MH: "Maharashtra",
  ML: "Meghalaya",
  MN: "Manipur",
  MP: "Madhya Pradesh",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TR: "Tripura",
  TS: "Telangana",
  UK: "Uttarakhand",
  UP: "Uttar Pradesh",
  WB: "West Bengal",
};

const countryDisplay = new Intl.DisplayNames(["en"], { type: "region" });

const getHeader = (req, name) => req.headers[name.toLowerCase()];

const normalizeCountry = (country) => {
  if (!country) return undefined;

  const value = String(country).trim();
  if (!value) return undefined;

  if (countryNames.includes(value)) return value;

  if (/^[A-Z]{2}$/i.test(value)) {
    const countryName = countryDisplay.of(value.toUpperCase());
    if (countryNames.includes(countryName)) return countryName;
  }

  return undefined;
};

const normalizeState = (country, state) => {
  if (!country || !state) return undefined;

  const value = String(state).trim();
  const states = getStatesForCountry(country);
  if (states.includes(value)) return value;

  if (country === "India") {
    const stateFromCode = indiaRegionCodes[value.toUpperCase()];
    if (states.includes(stateFromCode)) return stateFromCode;
  }

  return undefined;
};

const normalizeLocation = ({ country, state }) => {
  const normalizedCountry = normalizeCountry(country);
  if (!normalizedCountry) return undefined;

  const states = getStatesForCountry(normalizedCountry);
  const normalizedState = normalizeState(normalizedCountry, state);

  return {
    country: normalizedCountry,
    state: states.length > 0 && normalizedState ? normalizedState : undefined,
  };
};

const getClientIp = (req) => {
  const forwardedFor = getHeader(req, "x-forwarded-for");
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0];
  const ip =
    forwardedIp ||
    getHeader(req, "cf-connecting-ip") ||
    getHeader(req, "true-client-ip") ||
    getHeader(req, "x-real-ip") ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  return ip
    .replace(/^::ffff:/, "")
    .trim();
};

const isPublicIp = (ip) => {
  if (!ip || ip === "::1" || ip === "127.0.0.1") return false;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;

  return true;
};

const getLocationFromHeaders = (req) =>
  normalizeLocation({
    country:
      getHeader(req, "x-vercel-ip-country") ||
      getHeader(req, "cf-ipcountry") ||
      getHeader(req, "x-country"),
    state:
      getHeader(req, "x-vercel-ip-country-region") ||
      getHeader(req, "x-region") ||
      getHeader(req, "x-state"),
  });

const getLocationFromIp = async (ip) => {
  if (!isPublicIp(ip)) return undefined;

  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return undefined;

    const data = await response.json();

    return normalizeLocation({
      country: data.country_name || data.country,
      state: data.region,
    });
  } catch {
    return undefined;
  }
};

export const inferApproxLocation = async (req) => {
  const headerLocation = getLocationFromHeaders(req);
  if (headerLocation) return headerLocation;

  return getLocationFromIp(getClientIp(req));
};
