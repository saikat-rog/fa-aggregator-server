import mongoose from "mongoose";

const pricingItemSchema = new mongoose.Schema(
  {
    emoji: { type: String, default: "✨" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    price: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const pricingCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    items: { type: [pricingItemSchema], default: [] },
  },
  { _id: false }
);

const pricingPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    kicker: {
      type: String,
      trim: true,
      default: "",
    },
    heading: {
      type: String,
      trim: true,
      default: "",
    },
    subheading: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: String,
      trim: true,
      default: "mo",
    },
    yearlyPrice: {
      type: String,
      trim: true,
      default: "",
    },
    yearlyPeriod: {
      type: String,
      trim: true,
      default: "yr",
    },
    yearlyPaymentLink: {
      type: String,
      trim: true,
      default: "",
    },
    yearlyDiscountPercent: {
      type: Number,
      default: 0,
    },
    yearlyOriginalTotal: {
      type: String,
      trim: true,
      default: "",
    },
    originalTotal: {
      type: String,
      trim: true,
      default: "",
    },
    originalTotalLabel: {
      type: String,
      trim: true,
      default: "What you'd spend otherwise",
    },
    joinLabel: {
      type: String,
      trim: true,
      default: "",
    },
    trialNote: {
      type: String,
      trim: true,
      default: "✨ 14-day free trial, cancel anytime",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "Start My Free Trial →",
    },
    buttonLink: {
      type: String,
      trim: true,
      default: "",
    },
    yearlyButtonText: {
      type: String,
      trim: true,
      default: "",
    },
    yearlyButtonLink: {
      type: String,
      trim: true,
      default: "",
    },
    paymentLink: {
      type: String,
      trim: true,
      default: "",
    },
    categories: {
      type: [pricingCategorySchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PricingPlan", pricingPlanSchema);

