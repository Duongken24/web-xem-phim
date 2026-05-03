export const createSettingsService = ({
  getAdminUserFromRequest,
  isTmdbEnabled,
  setSystemSetting,
}) => ({
  async getPublicSettings() {
    const useTmdb = await isTmdbEnabled();
    return { success: true, use_tmdb: useTmdb };
  },

  async getAdminSettings(req) {
    await getAdminUserFromRequest(req);
    const useTmdb = await isTmdbEnabled();

    return {
      success: true,
      use_tmdb: useTmdb,
      settings: { use_tmdb: useTmdb },
    };
  },

  async updateUseTmdb(req) {
    await getAdminUserFromRequest(req);

    if (typeof req.body?.enabled !== "boolean") {
      const err = new Error("Body phai co truong enabled dang boolean.");
      err.statusCode = 400;
      throw err;
    }

    const enabled = req.body.enabled === true;
    await setSystemSetting(
      "use_tmdb",
      enabled,
      "Bat/tat TMDB runtime cho metadata va fallback."
    );

    return {
      success: true,
      use_tmdb: enabled,
      settings: { use_tmdb: enabled },
    };
  },
});
