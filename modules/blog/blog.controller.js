import * as blogService from "./blog.service.js";

export const createBlog = async (req, res) => {
  const data = await blogService.createBlog(req.body);
  res.status(201).json(data);
};

export const listBlogsAdmin = async (req, res) => {
  const data = await blogService.listBlogsAdmin(req.query);
  res.json(data);
};

export const getBlogByIdAdmin = async (req, res) => {
  const data = await blogService.getBlogByIdAdmin(req.params.id);
  res.json(data);
};

export const updateBlog = async (req, res) => {
  const data = await blogService.updateBlog(req.params.id, req.body);
  res.json(data);
};

export const publishBlog = async (req, res) => {
  const data = await blogService.publishBlog(req.params.id);
  res.json(data);
};

export const unpublishBlog = async (req, res) => {
  const data = await blogService.unpublishBlog(req.params.id);
  res.json(data);
};

export const deleteBlog = async (req, res) => {
  const data = await blogService.deleteBlog(req.params.id);
  res.json(data);
};

export const listPublishedBlogs = async (req, res) => {
  const data = await blogService.listPublishedBlogs(req.query);
  res.json(data);
};

export const getPublishedBlogBySlug = async (req, res) => {
  const data = await blogService.getPublishedBlogBySlug(req.params.slug);
  res.json(data);
};
