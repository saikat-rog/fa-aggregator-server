import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    source: {
      type: String,
      default: "homepage_newsletter",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const NewsletterSubscriber = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);

export default NewsletterSubscriber;
