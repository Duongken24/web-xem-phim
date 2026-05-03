import { createContentAccessService } from "./content-access.service.js";

export const createContentAccessController = (deps) => {
  const service = createContentAccessService(deps);

  const getContentAccess = async (req, res) => {
    try {
      const user = await deps.getOptionalUserFromToken(req);
      const payload = await service.getContentAccess(req.params.id, user?.id || null);

      res.json({
        success: true,
        content: payload.content,
        access: payload.access,
      });
    } catch (err) {
      console.error("[CONTENT ACCESS] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai thong tin quyen truy cap noi dung.",
      });
    }
  };

  const getBatchContentAccess = async (req, res) => {
    try {
      const user = await deps.getOptionalUserFromToken(req);
      const content = await service.getBatchContentAccess(req.body?.movieIds, user?.id || null);

      res.json({
        success: true,
        content,
      });
    } catch (err) {
      console.error("[CONTENT ACCESS BATCH] Error:", err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai thong tin truy cap hang loat.",
      });
    }
  };

  return {
    getBatchContentAccess,
    getContentAccess,
  };
};
