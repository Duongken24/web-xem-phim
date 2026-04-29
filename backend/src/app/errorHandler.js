import { sendError } from "../shared/response.js";

export const jsonSyntaxErrorHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return sendError(
      res,
      "Dữ liệu gửi lên backend không hợp lệ.",
      400
    );
  }

  next(err);
};

