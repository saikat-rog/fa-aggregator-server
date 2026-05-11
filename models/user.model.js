import mongoose from "mongoose";
import { ROLES } from "../common/constants/ROLES.js";
import { MARKETS } from "../common/constants/MARKETS.js";
import { LOCATIONS } from "../common/constants/LOCATIONS.js";
import {
  MARKET_INDICES,
  getMarketIndicesForCountry,
} from "../common/constants/MARKET_INDICES.js";

const countryNames = Object.keys(LOCATIONS);
const locationStates = [
  ...new Set(Object.values(LOCATIONS).flatMap((location) => location.states)),
];
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

const socialLinksSchema = new mongoose.Schema(
  {
    instagram: {
      url: { type: String, trim: true },
      followers: { type: Number, min: 0 },
    },
    linkedin: {
      url: { type: String, trim: true },
      connections: { type: Number, min: 0 },
    },
    twitter: {
      url: { type: String, trim: true },
      followers: { type: Number, min: 0 },
    },
    facebook: {
      url: { type: String, trim: true },
      followers: { type: Number, min: 0 },
    },
    youtube: {
      url: { type: String, trim: true },
      subscribers: { type: Number, min: 0 },
    },
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
      validate: {
        validator: function (indices) {
          const country = this.country || this.get?.("country");
          const allowedIndices = getMarketIndicesForCountry(country);
          return indices.every((index) => allowedIndices.includes(index));
        },
        message: "Expertise indices must match advisor country",
      },
    },
    emailForContact: {
      type: String,
      lowercase: true,
      trim: true,
    },
    personalWebsite: { type: String, trim: true },
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

export default mongoose.model("User", userSchema);
