import PricingPlan from "../../models/pricingPlan.model.js";

const DEFAULT_PLANS = [
  {
    planId: "free",
    name: "Free",
    price: "₹0",
    period: "month",
    tag: "gray",
    audience: "FOR BUSINESSES · TRY THE MARKETPLACE",
    pitch: "Enough to test whether local creators actually move the needle, before committing to anything.",
    features: [
      "1 active campaign per month",
      "Basic applicant dashboard",
      "Standard visibility to creators",
      "Barter or paid campaigns",
    ],
    buttonText: "Get Started Free",
    paymentLink: "",
    isActive: true,
    order: 1,
  },
  {
    planId: "growth",
    name: "Growth",
    price: "₹299",
    period: "month",
    tag: "violet",
    audience: "FOR BUSINESSES · RUN CAMPAIGNS ON REPEAT",
    pitch: "For businesses that want a steady stream of local creators, not a one-off experiment.",
    features: [
      "Unlimited active campaigns",
      "Full analytics dashboard",
      "Priority placement to nearby creators",
      "Faster application turnaround",
    ],
    buttonText: "Subscribe to Growth",
    paymentLink: "",
    isActive: true,
    order: 2,
  },
  {
    planId: "studio",
    name: "Pro / Studio",
    price: "From ₹50,000",
    period: "90-day sprint",
    tag: "coral",
    audience: "FOR BUSINESSES · A 90-DAY GROWTH SPRINT",
    pitch: "We start with a diagnostic report — infra, interiors, pricing, schemes, and advertising — then run a fully managed 90-day campaign against it, with a checkpoint every 30 days so you always know where things stand.",
    features: [
      "Professional photography & design",
      "Video and ad shoots",
      "Access to high-profile, invite-only creators",
      "Team-managed posting & local marketing",
    ],
    buttonText: "Book a Sprint",
    paymentLink: "",
    isActive: true,
    order: 3,
  },
];

export const ensureDefaultPlans = async () => {
  const count = await PricingPlan.countDocuments({});
  if (count === 0) {
    await PricingPlan.insertMany(DEFAULT_PLANS);
  }
};

export const getPublicPricingPlans = async () => {
  await ensureDefaultPlans();
  const plans = await PricingPlan.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  return { plans: plans.length > 0 ? plans : DEFAULT_PLANS };
};

export const getAllPricingPlansAdmin = async () => {
  await ensureDefaultPlans();
  const plans = await PricingPlan.find({}).sort({ order: 1, createdAt: 1 }).lean();
  return { plans };
};

export const updatePricingPlanAdmin = async (id, data = {}) => {
  const allowedFields = [
    "name",
    "price",
    "period",
    "tag",
    "audience",
    "pitch",
    "features",
    "paymentLink",
    "buttonText",
    "isActive",
    "order",
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === "features" && Array.isArray(data[field])) {
        updateData[field] = data[field].map((f) => String(f).trim()).filter(Boolean);
      } else if (typeof data[field] === "string") {
        updateData[field] = data[field].trim();
      } else {
        updateData[field] = data[field];
      }
    }
  }

  const plan = await PricingPlan.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!plan) {
    throw new Error("Pricing plan not found");
  }

  return { msg: "Pricing plan updated successfully", plan };
};

export const createPricingPlanAdmin = async (data = {}) => {
  const planId = (data.planId || data.name || "plan").toLowerCase().replace(/[^a-z0-9]/g, "-");
  
  const existing = await PricingPlan.findOne({ planId });
  if (existing) {
    throw new Error(`Plan with ID '${planId}' already exists`);
  }

  const plan = await PricingPlan.create({
    planId,
    name: data.name?.trim() || "New Plan",
    price: data.price?.trim() || "₹0",
    period: data.period?.trim() || "month",
    tag: data.tag?.trim() || "gray",
    audience: data.audience?.trim() || "",
    pitch: data.pitch?.trim() || "",
    features: Array.isArray(data.features) ? data.features : [],
    paymentLink: data.paymentLink?.trim() || "",
    buttonText: data.buttonText?.trim() || "Choose Plan",
    isActive: data.isActive !== false,
    order: data.order || 0,
  });

  return { msg: "Pricing plan created successfully", plan };
};

export const deletePricingPlanAdmin = async (id) => {
  const plan = await PricingPlan.findByIdAndDelete(id);
  if (!plan) {
    throw new Error("Pricing plan not found");
  }
  return { msg: "Pricing plan deleted successfully" };
};
