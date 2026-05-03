import { createContentAdminService } from "./content.admin.service.js";

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

export const createContentAdminController = (deps) => {
  const service = createContentAdminService(deps);

  const listContent = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const content = await service.listContent(req.query.q || "");
      res.json({ success: true, content });
    } catch (err) {
      console.error("[ADMIN CONTENT] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  const upsertContent = async (req, res) => {
    try {
      const auth = await requireAdminUser(req, deps.getAdminUserFromRequest);
      if (auth.error) return res.status(auth.error.status).json(auth.error.body);

      const content = await service.upsertContent(req.body, auth.user.id);
      res.json({ success: true, content });
    } catch (err) {
      console.error("[UPSERT CONTENT] Error:", err.message);
      res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  };

  return {
    listContent,
    upsertContent,
  };
};
