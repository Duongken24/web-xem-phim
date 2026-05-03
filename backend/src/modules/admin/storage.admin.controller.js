export const createAdminStorageController = ({
  getAdminUserFromRequest,
  runSingleUpload,
  service,
}) => ({
  async getStorageHealth(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const storage = await service.getStorageHealth();

      return res
        .status(storage.ok ? 200 : 400)
        .json({ success: storage.ok, storage, error: storage.ok ? null : storage.error });
    } catch (err) {
      console.error("[ADMIN STORAGE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async createSource(req, res) {
    try {
      const { user } = await getAdminUserFromRequest(req);
      const source = await service.createSource(req.params.movieId, req.body || {}, user.id);

      return res.json({ success: true, source });
    } catch (err) {
      console.error("[CREATE MOVIE SOURCE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async createEpisode(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const episode = await service.createEpisode(req.params.movieId, req.body || {});

      return res.json({ success: true, episode });
    } catch (err) {
      console.error("[CREATE EPISODE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async uploadMovieVideo(req, res) {
    try {
      const { user } = await getAdminUserFromRequest(req);
      const file = await runSingleUpload(req, res, "video");
      const payload = await service.uploadMovieVideo({
        movieId: req.params.movieId,
        file,
        body: req.body || {},
        userId: user.id,
      });

      return res.json(payload);
    } catch (err) {
      console.error("[UPLOAD MOVIE VIDEO] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async deleteSource(req, res) {
    try {
      await getAdminUserFromRequest(req);
      await service.deleteSource(req.params.sourceId);

      return res.json({ success: true });
    } catch (err) {
      console.error("[DELETE MOVIE SOURCE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async uploadEpisodeVideo(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const file = await runSingleUpload(req, res, "video");
      const payload = await service.uploadEpisodeVideo({
        episodeId: req.params.episodeId,
        file,
        body: req.body || {},
      });

      return res.json(payload);
    } catch (err) {
      console.error("[UPLOAD EPISODE VIDEO] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },
});
