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
const SOCIAL_USERNAME_REGEX = /^@?[a-zA-Z0-9._-]{2,100}$/;

const socialUsernameField = (platform) => ({
  type: String,
  trim: true,
  validate: {
    validator(value) {
      if (!value) return true;
      return SOCIAL_USERNAME_REGEX.test(value);
    },
    message: `${platform} must be a valid username`,
  },
});

const socialLinksSchema = new mongoose.Schema(
  {
    instagram: socialUsernameField("instagram"),
    youtube: socialUsernameField("youtube"),
    telegram: socialUsernameField("telegram"),
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: {
      type: String,
      trim: true,
      match: [/^[1-9]\d{5}$/, "Please provide a valid Indian pincode"],
    },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
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
    industries: {
      type: [{ type: String, trim: true }],
      default: [],
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
      type: [{ type: String, trim: true }],
      default: [],
    },
    expertiseIndeces: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    emailForContact: {
      type: String,
      lowercase: true,
      trim: true,
    },
    personalWebsite: { type: String, trim: true },
    ppp: { type: Number, min: 0 },
    category: { type: String, trim: true },
    instagramFollowers: { type: Number, min: 0 },
    instagramEngagementRateScore: { type: Number, min: 0 },
    youtubeSubscribers: { type: Number, min: 0 },
    telegramFollowers: { type: Number, min: 0 },
    instagramProfilePictureUrl: { type: String, trim: true },
    socialMetricsLastSyncedAt: { type: Date },
    socialMetricsSyncStatus: {
      type: String,
      enum: ["success", "failed"],
    },
    socialMetricsLastError: { type: String, trim: true },
    analytics: {
      profileClicks: { type: Number, default: 0, min: 0 },
      socialClicks: {
        total: { type: Number, default: 0, min: 0 },
        byPlatform: {
          instagram: { type: Number, default: 0, min: 0 },
          tiktok: { type: Number, default: 0, min: 0 },
          linkedin: { type: Number, default: 0, min: 0 },
          twitter: { type: Number, default: 0, min: 0 },
          facebook: { type: Number, default: 0, min: 0 },
          youtube: { type: Number, default: 0, min: 0 },
          email: { type: Number, default: 0, min: 0 },
          website: { type: Number, default: 0, min: 0 },
          profileShare: { type: Number, default: 0, min: 0 },
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
    savedAdvisors: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    advisorProfile: advisorProfileSchema,
    googleAuth: {
      googleId: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      linkedAt: { type: Date },
    },
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
