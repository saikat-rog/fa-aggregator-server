import NewsletterSubscriber from "../../models/newsletterSubscriber.model.js";
import {
  buildNewsletterThankYouEmail,
  buildAdminNewsletterNotificationEmail,
  sendEmailSafely,
} from "../../common/services/mail.service.js";
import env from "../../config/env.js";

export const subscribeNewsletter = async ({ email, source = "homepage_newsletter" }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Please provide a valid email address.");
  }

  let subscriber = await NewsletterSubscriber.findOne({ email: normalizedEmail });
  let isNew = false;

  if (subscriber) {
    if (subscriber.status === "unsubscribed") {
      subscriber.status = "active";
      subscriber.source = source;
      await subscriber.save();
      isNew = true;
    }
  } else {
    subscriber = await NewsletterSubscriber.create({
      email: normalizedEmail,
      source,
      status: "active",
    });
    isNew = true;
  }

  // Send thank you confirmation email to subscriber
  sendEmailSafely({
    to: normalizedEmail,
    template: buildNewsletterThankYouEmail({ email: normalizedEmail }),
    contextLabel: "newsletter thank you confirmation",
  });

  // If new, also notify Admin
  if (isNew && env.adminEmail) {
    sendEmailSafely({
      to: env.adminEmail,
      template: buildAdminNewsletterNotificationEmail({
        email: normalizedEmail,
        source,
        date: new Date().toLocaleString(),
      }),
      contextLabel: "admin newsletter notification",
    });
  }

  return subscriber;
};

export const listSubscribers = async ({ page = 1, limit = 20, search = "", status = "" } = {}) => {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = {};
  if (search && search.trim()) {
    query.email = { $regex: search.trim(), $options: "i" };
  }
  if (status && status.trim()) {
    query.status = status.trim();
  }

  const [subscribers, total] = await Promise.all([
    NewsletterSubscriber.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit).lean(),
    NewsletterSubscriber.countDocuments(query),
  ]);

  return {
    subscribers,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
};

export const deleteSubscriber = async (id) => {
  const subscriber = await NewsletterSubscriber.findByIdAndDelete(id);
  if (!subscriber) {
    throw new Error("Subscriber not found.");
  }
  return subscriber;
};
