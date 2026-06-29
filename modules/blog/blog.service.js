import Blog from "../../models/blog.model.js";

const URL_REGEX = /^https?:\/\//i;

const getPagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : Math.min(parsedLimit, 100);

  return {
    page: currentPage,
    limit: perPage,
    skip: (currentPage - 1) * perPage
  };
};

const normalizeTagList = (rawTags) => {
  if (!rawTags) return [];

  const values = Array.isArray(rawTags) ? rawTags : String(rawTags).split(",");
  return [...new Set(values.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
};

const slugify = (value = "") => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

const ensureValidImageUrl = (url, fieldName = "coverImageUrl") => {
  if (!url || !URL_REGEX.test(url)) {
    throw new Error(`${fieldName} must be a valid image URL`);
  }
};

const computeReadingTimeMinutes = (content = "") => {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};

const buildSeoPayload = (seo = {}, fallback = {}) => {
  const metaTitle = seo.metaTitle?.trim() || fallback.title?.trim() || "";
  const metaDescription = seo.metaDescription?.trim() || fallback.excerpt?.trim() || "";
  const canonicalUrl = seo.canonicalUrl?.trim() || undefined;
  const ogImageUrl = seo.ogImageUrl?.trim() || fallback.coverImageUrl?.trim() || undefined;

  if (canonicalUrl && !URL_REGEX.test(canonicalUrl)) {
    throw new Error("seo.canonicalUrl must be a valid URL");
  }

  if (ogImageUrl && !URL_REGEX.test(ogImageUrl)) {
    throw new Error("seo.ogImageUrl must be a valid URL");
  }

  return {
    metaTitle: metaTitle.slice(0, 60),
    metaDescription: metaDescription.slice(0, 160),
    canonicalUrl,
    ogImageUrl,
    noIndex: Boolean(seo.noIndex)
  };
};

const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await Blog.findOne({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).select("_id");
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

const normalizeCreatePayload = async (data = {}) => {
  const title = data.title?.trim();
  const content = data.content?.trim();
  const excerpt = data.excerpt?.trim();
  const coverImageUrl = data.coverImageUrl?.trim();

  if (!title) throw new Error("Title is required");
  if (!content) throw new Error("Content is required");

  if (coverImageUrl) {
    ensureValidImageUrl(coverImageUrl);
  }

  const baseSlug = slugify(data.slug || title);
  if (!baseSlug) throw new Error("Unable to create slug from title");

  const slug = await ensureUniqueSlug(baseSlug);

  return {
    title,
    slug,
    excerpt,
    content,
    coverImageUrl: coverImageUrl || undefined,
    tags: normalizeTagList(data.tags),
    status: data.status === "published" ? "published" : "draft",
    publishedAt: data.status === "published" ? new Date() : null,
    seo: buildSeoPayload(data.seo, { title, excerpt, coverImageUrl })
  };
};

export const createBlog = async (data = {}) => {
  const payload = await normalizeCreatePayload(data);
  const blog = await Blog.create(payload);
  return { msg: "Blog created", blog };
};

export const listBlogsAdmin = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search?.trim()) {
    const value = query.search.trim();
    filter.$or = [
      { title: { $regex: value, $options: "i" } },
      { excerpt: { $regex: value, $options: "i" } },
      { tags: { $regex: value, $options: "i" } }
    ];
  }

  const [items, total] = await Promise.all([
    Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Blog.countDocuments(filter)
  ]);

  return {
    blogs: items.map((blog) => ({ ...blog, readingTimeMinutes: computeReadingTimeMinutes(blog.content) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const getBlogByIdAdmin = async (id) => {
  const blog = await Blog.findById(id).lean();
  if (!blog) throw new Error("Blog not found");
  return { blog: { ...blog, readingTimeMinutes: computeReadingTimeMinutes(blog.content) } };
};

export const updateBlog = async (id, data = {}) => {
  const blog = await Blog.findById(id);
  if (!blog) throw new Error("Blog not found");

  const updates = {};

  if (data.title !== undefined) {
    const title = data.title?.trim();
    if (!title) throw new Error("Title cannot be empty");
    updates.title = title;
  }

  if (data.content !== undefined) {
    const content = data.content?.trim();
    if (!content) throw new Error("Content cannot be empty");
    updates.content = content;
  }

  if (data.excerpt !== undefined) {
    updates.excerpt = data.excerpt?.trim() || "";
  }

  if (data.coverImageUrl !== undefined) {
    const coverImageUrl = data.coverImageUrl?.trim();
    if (!coverImageUrl) throw new Error("coverImageUrl cannot be empty");
    ensureValidImageUrl(coverImageUrl);
    updates.coverImageUrl = coverImageUrl;
  }

  if (data.tags !== undefined) {
    updates.tags = normalizeTagList(data.tags);
  }

  if (data.slug !== undefined || updates.title) {
    const baseSlug = slugify(data.slug || updates.title || blog.title);
    if (!baseSlug) throw new Error("Unable to create slug");
    updates.slug = await ensureUniqueSlug(baseSlug, blog._id);
  }

  if (data.seo !== undefined) {
    updates.seo = buildSeoPayload(data.seo || {}, {
      title: updates.title || blog.title,
      excerpt: updates.excerpt !== undefined ? updates.excerpt : blog.excerpt,
      coverImageUrl: updates.coverImageUrl || blog.coverImageUrl
    });
  }

  const updated = await Blog.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  ).lean();

  return { msg: "Blog updated", blog: { ...updated, readingTimeMinutes: computeReadingTimeMinutes(updated.content) } };
};

export const publishBlog = async (id) => {
  const blog = await Blog.findById(id);
  if (!blog) throw new Error("Blog not found");

  blog.status = "published";
  blog.publishedAt = blog.publishedAt || new Date();
  await blog.save();

  return { msg: "Blog published", blog };
};

export const unpublishBlog = async (id) => {
  const blog = await Blog.findById(id);
  if (!blog) throw new Error("Blog not found");

  blog.status = "draft";
  await blog.save();

  return { msg: "Blog moved to draft", blog };
};

export const deleteBlog = async (id) => {
  const deleted = await Blog.findByIdAndDelete(id);
  if (!deleted) throw new Error("Blog not found");
  return { msg: "Blog deleted" };
};

export const listPublishedBlogs = async (query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const filter = { status: "published" };

  if (query.tag?.trim()) {
    filter.tags = query.tag.trim().toLowerCase();
  }

  if (query.search?.trim()) {
    const value = query.search.trim();
    filter.$or = [
      { title: { $regex: value, $options: "i" } },
      { excerpt: { $regex: value, $options: "i" } },
      { tags: { $regex: value, $options: "i" } }
    ];
  }

  const [items, total] = await Promise.all([
    Blog.find(filter)
      .select("title slug excerpt coverImageUrl tags seo publishedAt createdAt updatedAt")
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Blog.countDocuments(filter)
  ]);

  return {
    blogs: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const getPublishedBlogBySlug = async (slug) => {
  const normalizedSlug = slug?.trim().toLowerCase();
  if (!normalizedSlug) throw new Error("Slug is required");

  const blog = await Blog.findOne({ slug: normalizedSlug, status: "published" }).lean();
  if (!blog) throw new Error("Blog not found");

  return { blog: { ...blog, readingTimeMinutes: computeReadingTimeMinutes(blog.content) } };
};
