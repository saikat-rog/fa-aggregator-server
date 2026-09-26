import * as pricingPlanService from "./pricingPlan.service.js";

export const getPublicPricingPlans = async (req, res) => {
  const data = await pricingPlanService.getPublicPricingPlans();
  res.json(data);
};

export const getAllPricingPlansAdmin = async (req, res) => {
  const data = await pricingPlanService.getAllPricingPlansAdmin();
  res.json(data);
};

export const updatePricingPlanAdmin = async (req, res) => {
  const data = await pricingPlanService.updatePricingPlanAdmin(req.params.id, req.body);
  res.json(data);
};

export const createPricingPlanAdmin = async (req, res) => {
  const data = await pricingPlanService.createPricingPlanAdmin(req.body);
  res.status(201).json(data);
};

export const deletePricingPlanAdmin = async (req, res) => {
  const data = await pricingPlanService.deletePricingPlanAdmin(req.params.id);
  res.json(data);
};
