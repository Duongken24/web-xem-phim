import {
  getAdminUserFromRequest,
  getUserFromToken,
} from "./auth.service.js";

export const requireAuth = async (req, res, next) => {
  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Chưa đăng nhập" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const { user, profile } = await getAdminUserFromRequest(req);
    req.user = user;
    req.userProfile = profile;
    next();
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, error: err.message });
  }
};

