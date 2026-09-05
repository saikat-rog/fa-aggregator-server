import * as campaignApplicationService from "./campaignApplication.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 400).json({ msg: error.message || "Something went wrong" });
};

export const submitCampaignApplication = async (req, res) => {
  try {
    const data = await campaignApplicationService.submitCampaignApplication({
      campaignId: req.params.campaignId,
      applicantUser: req.user,
      message: req.body.message,
    });
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listOwnerReceivedApplications = async (req, res) => {
  try {
    const data = await campaignApplicationService.listOwnerReceivedApplications({
      ownerUserId: req.user._id,
      query: req.query,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const markApplicationResponded = async (req, res) => {
  try {
    const data = await campaignApplicationService.markApplicationResponded({
      ownerUserId: req.user._id,
      applicationId: req.params.id,
    });
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};

export const listAdminCampaignApplications = async (req, res) => {
  try {
    const data = await campaignApplicationService.listAdminCampaignApplications(req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
};
