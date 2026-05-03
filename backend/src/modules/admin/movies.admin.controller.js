export const createAdminMoviesController = ({ getAdminUserFromRequest, service }) => ({
  async listMovies(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const movies = await service.listMovies();
      return res.json({ success: true, movies });
    } catch (err) {
      console.error("[ADMIN MOVIES] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async getMeta(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const meta = await service.getMeta();
      return res.json({
        success: true,
        ...meta,
      });
    } catch (err) {
      console.error("[ADMIN MOVIES META] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async createMovie(req, res) {
    try {
      const { user } = await getAdminUserFromRequest(req);
      const movie = await service.createMovie(req.body || {}, user.id);
      return res.json({ success: true, movie });
    } catch (err) {
      console.error("[CREATE ADMIN MOVIE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async updateMovie(req, res) {
    try {
      const { user } = await getAdminUserFromRequest(req);
      const movie = await service.updateMovie(req.params.movieId, req.body || {}, user.id);
      return res.json({ success: true, movie });
    } catch (err) {
      console.error("[UPDATE ADMIN MOVIE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async deleteMovie(req, res) {
    try {
      await getAdminUserFromRequest(req);
      const payload = await service.deleteMovie(req.params.movieId);
      return res.json({
        success: true,
        ...payload,
      });
    } catch (err) {
      console.error("[DELETE ADMIN MOVIE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },

  async upsertMovie(req, res) {
    try {
      const { user } = await getAdminUserFromRequest(req);
      const payload = await service.upsertMovie(req.body || {}, user.id);
      return res.json({
        success: true,
        action: payload.action,
        movie: payload.movie,
      });
    } catch (err) {
      console.error("[UPSERT ADMIN MOVIE] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  },
});
