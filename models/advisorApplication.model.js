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
