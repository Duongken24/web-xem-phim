export const createSettingsController = ({
  service,
  isSystemSettingsSchemaMissingError,
  useTmdbFallback,
}) => ({
  async publicSettings(_req, res) {
    try {
      const payload = await service.getPublicSettings();
      return res.json(payload);
    } catch (err) {
      console.error("[SETTINGS PUBLIC] Error:", err.message);
      return res.json({ success: true, use_tmdb: useTmdbFallback });
    }
  },

  async adminSettings(req, res) {
    try {
      const payload = await service.getAdminSettings(req);
      return res.json(payload);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the tai cai dat he thong.",
      });
    }
  },

  async updateUseTmdb(req, res) {
    try {
      const payload = await service.updateUseTmdb(req);
      return res.json(payload);
    } catch (err) {
      if (isSystemSettingsSchemaMissingError(err)) {
        return res.status(503).json({
          success: false,
          error: "Bang system_settings chua san sang. Hay chay migration truoc.",
        });
      }

      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the cap nhat cai dat TMDB.",
      });
    }
  },
});
