import PricingPlan from "../../models/pricingPlan.model.js";

export const DEFAULT_PLANS = [
  {
    planId: "business",
    name: "Folksmint Business",
    kicker: "For local business",
    heading: "Everything AI marketing does",
    subheading: "One dashboard replaces your SEO tool, your social media manager, and your review-reply habit.",
    price: "$19",
    period: "mo",
    originalTotal: "$134/mo",
    originalTotalLabel: "What you'd spend otherwise",
    joinLabel: "Join Folksmint Business",
    trialNote: "✨ 14-day free trial, cancel anytime",
    buttonText: "Start My Free Trial →",
    buttonLink: "/auth?role=user",
    paymentLink: "",
    isActive: true,
    order: 1,
    categories: [
      {
        title: "📈 Visibility & audits",
        items: [
          {
            emoji: "🔍",
            title: "Free Google Score Audit",
            description: "Full audit of your online performance",
            price: "$25",
          },
          {
            emoji: "🔑",
            title: "SEO Keyword Analysis",
            description: "Targeted keywords to boost search traffic",
            price: "$20",
          },
          {
            emoji: "🎯",
            title: "Competitor Analysis",
            description: "See what's working for others nearby",
            price: "$20",
          },
        ],
      },
      {
        title: "💬 Reputation & content",
        items: [
          {
            emoji: "✍️",
            title: "Personalized Google Review Replies",
            description: "On-brand replies drafted automatically",
            price: "$15",
          },
          {
            emoji: "🖼️",
            title: "Weekly Image Updates for Google",
            description: "Keeps your profile fresh and current",
            price: "$15",
          },
          {
            emoji: "📲",
            title: "AI Social Posting",
            description: "Captions + images, posted to FB & IG together",
            price: "$29",
          },
          {
            emoji: "📊",
            title: "Daily Reports on WhatsApp",
            description: "Your numbers, delivered where you already are",
            price: "$10",
          },
        ],
      },
    ],
  },
  {
    planId: "creators",
    name: "Folksmint Creator",
    kicker: "For Creators",
    heading: "Everything your creator business needs",
    subheading: "One dashboard replaces your storefront, booking tool, course platform, and audience growth stack.",
    price: "$29",
    period: "mo",
    originalTotal: "$413/mo",
    originalTotalLabel: "What you'd spend otherwise",
    joinLabel: "Join Folksmint Creator",
    trialNote: "✨ 14-day free trial, cancel anytime",
    buttonText: "Start My Free Trial →",
    buttonLink: "/auth?role=advisor",
    paymentLink: "",
    isActive: true,
    order: 2,
    categories: [
      {
        title: "🛍️ Storefront & sales",
        items: [
          {
            emoji: "📱",
            title: "Mobile \"Link-in-Bio\" Store",
            description: "Replaces Squarespace, Linktree",
            price: "$29",
          },
          {
            emoji: "📅",
            title: "Calendar Invites & Bookings",
            description: "Replaces Calendly, Acuity",
            price: "$15",
          },
          {
            emoji: "🎓",
            title: "Course Builder",
            description: "Replaces Kajabi",
            price: "$119",
          },
        ],
      },
      {
        title: "📣 Growth & community",
        items: [
          {
            emoji: "📈",
            title: "Audience Analytics",
            description: "Replaces Google Analytics",
            price: "$10",
          },
          {
            emoji: "✈️",
            title: "Instagram AutoDMs",
            description: "Replaces Manychat",
            price: "$15",
          },
          {
            emoji: "✉️",
            title: "Email List / Newsletter Builder",
            description: "Own your audience, not just your followers",
            price: "$29",
          },
          {
            emoji: "🔒",
            title: "Exclusive Creator Community",
            description: "Access to fellow creators & swipe files",
            price: "$97",
          },
          {
            emoji: "🛠️",
            title: "1:1 Creator Strategy Coaching",
            description: "Personal guidance on growing your store",
            price: "$99",
          },
        ],
      },
    ],
  },
];

export const ensureDefaultPlans = async () => {
  // If either "business" or "creators" plan is missing, initialize or seed them
  for (const defaultPlan of DEFAULT_PLANS) {
    const existing = await PricingPlan.findOne({ planId: defaultPlan.planId });
    if (!existing) {
      await PricingPlan.create(defaultPlan);
    }
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
    "kicker",
    "heading",
    "subheading",
    "price",
    "period",
    "originalTotal",
    "originalTotalLabel",
    "joinLabel",
    "trialNote",
    "buttonText",
    "buttonLink",
    "paymentLink",
    "categories",
    "isActive",
    "order",
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      if (field === "categories" && Array.isArray(data[field])) {
        updateData[field] = data[field].map((cat) => ({
          title: String(cat.title || "").trim(),
          items: Array.isArray(cat.items)
            ? cat.items.map((item) => ({
                emoji: String(item.emoji || "✨").trim(),
                title: String(item.title || "").trim(),
                description: String(item.description || "").trim(),
                price: String(item.price || "").trim(),
              }))
            : [],
        }));
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
    kicker: data.kicker?.trim() || "",
    heading: data.heading?.trim() || "",
    subheading: data.subheading?.trim() || "",
    price: data.price?.trim() || "$0",
    period: data.period?.trim() || "mo",
    originalTotal: data.originalTotal?.trim() || "",
    originalTotalLabel: data.originalTotalLabel?.trim() || "What you'd spend otherwise",
    joinLabel: data.joinLabel?.trim() || "",
    trialNote: data.trialNote?.trim() || "✨ 14-day free trial, cancel anytime",
    buttonText: data.buttonText?.trim() || "Start My Free Trial →",
    buttonLink: data.buttonLink?.trim() || "",
    paymentLink: data.paymentLink?.trim() || "",
    categories: Array.isArray(data.categories) ? data.categories : [],
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

