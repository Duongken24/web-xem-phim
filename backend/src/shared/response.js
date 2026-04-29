export const sendSuccess = (res, payload = {}, status = 200) => {
  return res.status(status).json({ success: true, ...payload });
};

export const sendError = (res, error, status = 500, extra = {}) => {
  return res.status(status).json({
    success: false,
    error,
    ...extra,
  });
};

