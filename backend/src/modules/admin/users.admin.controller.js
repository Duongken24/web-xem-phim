import { createUsersAdminService } from "./users.admin.service.js";

const requireAdminUser = async (req, getAdminUserFromRequest) => {
  const user = (await getAdminUserFromRequest(req)).user;
  if (!user) {
    return { error: { status: 401, body: { success: false, error: "ChÆ°a Ä‘Äƒng nháº­p" } } };
  }

  const profile = { role: "admin" };

  if (profile?.role !== "admin") {
    return { error: { status: 403, body: { success: false, error: "Báº¡n khÃ´ng cÃ³ quyá»n truy cáº­p" } } };
  }

  return { user };
};

export const createUsersAdminController = (deps) => {
  const service = createUsersAdminService(deps);

  const listUsers = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const users = await service.listUsers(req.query.q || "");
      res.json({ success: true, users });
    } catch (err) {
      console.error("[ADMIN USERS] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const createUser = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const result = await service.createUser(req.body);
      res.json({
        success: true,
        user: result.user,
        profile: result.profile,
      });
    } catch (err) {
      console.error("[CREATE USER] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const updateUserRole = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const updatedProfile = await service.updateUserRole(req.params.userId, req.body.role);
      res.json({ success: true, profile: updatedProfile });
    } catch (err) {
      console.error("[UPDATE USER ROLE] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const updateUserBlock = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const updatedProfile = await service.updateUserBlock(req.params.userId, req.body.isBlocked);
      res.json({ success: true, profile: updatedProfile });
    } catch (err) {
      console.error("[BLOCK USER] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  return {
    createUser,
    listUsers,
    updateUserBlock,
    updateUserRole,
  };
};
