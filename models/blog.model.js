import mongoose from "mongoose";

const blogSeoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    ogImageUrl: { type: String, trim: true },
    noIndex: { type: Boolean, default: false }
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    excerpt: { type: String, trim: true, maxlength: 300 },
    content: { type: String, required: true, trim: true },
    coverImageUrl: { type: String, trim: true },
    tags: { type: [{ type: String, trim: true, lowercase: true }], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date, default: null, index: true },
    seo: { type: blogSeoSchema, default: {} }
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ tags: 1, status: 1 });
blogSchema.index({ title: "text", excerpt: "text", content: "text" });

export default mongoose.model("Blog", blogSchema);
