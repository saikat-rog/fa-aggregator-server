import mongoose from "mongoose";
import { ROLES } from "../common/constants/ROLES.js";
import { MARKETS } from "../common/constants/MARKETS.js";
import { LOCATIONS } from "../common/constants/LOCATIONS.js";
import { MARKET_INDICES } from "../common/constants/MARKET_INDICES.js";

const countryNames = Object.keys(LOCATIONS);
const locationStates = [
  ...new Set(Object.values(LOCATIONS).flatMap((location) => location.states)),
];
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

const socialLinksSchema = new mongoose.Schema(
  {
    instagram: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
    youtube: { type: String, trim: true },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true, enum: countryNames },
    state: {
      type: String,
      trim: true,
      enum: locationStates,
      required: function () {
        return getStatesForCountry(this.country).length > 0;
      },
      validate: {
        validator: function (state) {
          if (!state) return true;

          const country = this.country || this.get?.("country");
          return getStatesForCountry(country).includes(state);
        },
        message: "State must match country",
      },
    },
  },
  { _id: false },
);

const advisorProfileSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9._]+$/, "Username can contain lowercase letters, numbers, dots and underscores only"],
    },
    industry: {
      type: String,
      trim: true,
    },
    country: { type: String, trim: true, enum: countryNames },
    state: {
      type: String,
      trim: true,
      enum: locationStates,
      required: function () {
        return getStatesForCountry(this.country).length > 0;
      },
      validate: {
        validator: function (state) {
          if (!state) return true;

          const country = this.country || this.get?.("country");
          return getStatesForCountry(country).includes(state);
        },
        message: "State must match advisor country",
      },
    },
    verificationStatus: {
      type: String,
      enum: ["not_applied", "pending", "approved", "rejected"],
      default: "not_applied",
    },
    socialLinks: {
      type: socialLinksSchema,
      default: {},
    },
    about: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    marketFocus: {
      type: [
        {
          type: String,
          enum: MARKETS,
        },
      ],
      default: [],
    },
    expertiseIndeces: {
      type: [{ type: String, enum: MARKET_INDICES }],
      default: [],
    },
    emailForContact: {
      type: String,
      lowercase: true,
      trim: true,
    },
    personalWebsite: { type: String, trim: true },
    analytics: {
      profileClicks: { type: Number, default: 0, min: 0 },
      socialClicks: {
        total: { type: Number, default: 0, min: 0 },
        byPlatform: {
          instagram: { type: Number, default: 0, min: 0 },
          linkedin: { type: Number, default: 0, min: 0 },
          twitter: { type: Number, default: 0, min: 0 },
          facebook: { type: Number, default: 0, min: 0 },
          youtube: { type: Number, default: 0, min: 0 },
        },
      },
    },
  },
  { _id: false },
);

const authCredentialSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      sparse: true,
      trim: true,
      match: [/^\+?[1-9]\d{7,14}$/, "Please provide a valid phone number"],
    },
    password: {
      type: String,
      select: false,
    },
    authCredentials: {
      type: [authCredentialSchema],
      default: [],
      select: false,
      validate: {
        validator: (credentials) => {
          const roles = credentials.map((credential) => credential.role);
          return roles.length === new Set(roles).size;
        },
        message: "Credentials must be unique per role",
      },
    },
    roles: {
      type: [
        {
          type: String,
          enum: ROLES,
        },
      ],
      default: ["user"],
      validate: {
        validator: (roles) =>
          Array.isArray(roles) &&
          roles.length > 0 &&
          roles.length === new Set(roles).size,
        message: "User must have at least one unique role",
      },
    },
    approxLocation: {
      type: locationSchema,
      default: null,
    },
    advisorProfile: advisorProfileSchema,
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ roles: 1, createdAt: -1 });
userSchema.index(
  { "advisorProfile.username": 1 },
  {
    unique: true,
    sparse: true,
  },
);

export default mongoose.model("User", userSchema);
