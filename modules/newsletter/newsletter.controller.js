import {
  subscribeNewsletter,
  listSubscribers,
  deleteSubscriber,
} from "./newsletter.service.js";

export const handleSubscribe = async (req, res, next) => {
  try {
    const { email, source } = req.body;
    const subscriber = await subscribeNewsletter({ email, source });
    return res.status(200).json({
      success: true,
      msg: "Successfully subscribed to the newsletter. A confirmation email has been sent!",
      data: {
        id: subscriber._id,
        email: subscriber.email,
        createdAt: subscriber.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleListSubscribers = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await listSubscribers({ page, limit, search, status });
    return res.status(200).json({
      success: true,
      msg: "Success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleDeleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteSubscriber(id);
    return res.status(200).json({
      success: true,
      msg: "Subscriber removed successfully.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
