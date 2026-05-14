import mongoose from "mongoose";
import { LOCATIONS } from "../common/constants/LOCATIONS.js";
import { MARKETS } from "../common/constants/MARKETS.js";
import { MARKET_INDICES } from "../common/constants/MARKET_INDICES.js";

const countryNames = Object.keys(LOCATIONS);
const locationStates = [
  ...new Set(Object.values(LOCATIONS).flatMap((location) => location.states)),
];
const getStatesForCountry = (country) => LOCATIONS[country]?.states || [];

const socialLinksSchema = new mongoose.Schema(
  {
    instagram: { type: String, trim: true },
    tiktok: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
    youtube: { type: String, trim: true },
  },
  { _id: false },
);

const advisorApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9._]+$/, "Username can contain lowercase letters, numbers, dots and underscores only"],
      required: true,
    },
    industries: {
      type: [{ type: String, trim: true }],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one industry is required",
      },
      default: [],
    },
    country: {
      type: String,
      trim: true,
      enum: countryNames,
      required: true,
    },
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
    socialLinks: {
      type: socialLinksSchema,
      default: {},
    },
    about: {
      type: String,
      trim: true,
      maxlength: 1000,
      required: true,
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
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid contact email"],
    },
    personalWebsite: { type: String, trim: true },
    instagramFollowers: { type: Number, min: 0 },
    youtubeSubscribers: { type: Number, min: 0 },
    tiktokFollowers: { type: Number, min: 0 },
    linkedinFollowers: { type: Number, min: 0 },
    facebookFollowers: { type: Number, min: 0 },
    twitterFollowers: { type: Number, min: 0 },
    reviewedAt: Date,
    rejectionReason: {
      type: String,
      trim: true,
      required: function () {
        return this.status === "rejected";
      },
    },
  },
  { timestamps: true },
);

advisorApplicationSchema.index({ user: 1, status: 1 });
advisorApplicationSchema.index({ country: 1, state: 1, status: 1 });
advisorApplicationSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

export default mongoose.model("AdvisorApplication", advisorApplicationSchema);
