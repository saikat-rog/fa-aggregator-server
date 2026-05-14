import * as enquiryService from "../enquiry/enquiry.service.js";

const sendError = (res, error) => {
  res.status(error.statusCode || 500).json({ msg: error.message || "Something went wrong" });
};

export const submitAdvisorEnquiry = async (req, res) => {
  try {
    const data = await enquiryService.submitEnquiry({
      advisorId: req.params.advisorId,
      userId: req.user._id,
      data: req.body,
    });
    res.status(201).json(data);
  } catch (error) {
    sendError(res, error);
  }
};

