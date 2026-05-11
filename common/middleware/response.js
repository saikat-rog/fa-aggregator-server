const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getDataPayload = (body) => {
  if (body === undefined || body === null) return null;

  if (!isPlainObject(body)) return body;

  const { success, msg, ...data } = body;
  return Object.keys(data).length > 0 ? data : null;
};

export const normalizeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (isPlainObject(body) && "success" in body && "msg" in body && "data" in body) {
      return originalJson(body);
    }

    const statusCode = res.statusCode || 200;
    const success = statusCode < 400;
    const msg = isPlainObject(body) && body.msg
      ? body.msg
      : success
        ? "Success"
        : "Something went wrong";

    return originalJson({
      success,
      msg,
      data: getDataPayload(body),
    });
  };

  next();
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    msg: "Route not found",
    data: null,
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    msg: error.message || "Something went wrong",
    data: null,
  });
};
