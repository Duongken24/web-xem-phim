export const createMoviesController = ({ service, getUserFromToken }) => ({
  async listMovies(req, res) {
    try {
      const movies = await service.listPublicMovies(req.query || {});
      return res.json({
        success: true,
        movies,
      });
    } catch (err) {
      console.error("[MOVIES] Error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async getByTmdbId(req, res) {
    try {
      const movie = await service.getMovieByTmdbId(req.params.tmdbId);

      return res.json({
        success: true,
        movie,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "Lá»—i há»‡ thá»‘ng" });
    }
  },

  async similarMovies(req, res) {
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit || 10) || 10, 24));
      const result = await service.getSimilarMovies({
        movieId: req.params.movieId,
        limit,
      });

      return res.json({
        success: true,
        movie_id: result.movie.id,
        items: result.items,
      });
    } catch (err) {
      console.error("[SIMILAR MOVIES] Error:", err.message);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the lay phim tuong tu.",
      });
    }
  },

  async ensureTmdb(req, res) {
    try {
      const user = await getUserFromToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: "ChÃ†Â°a Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p" });
      }

      const payload = await service.ensureTmdbMovie(req.body || {});

      return res.json({
        success: true,
        action: payload.action,
        movie: payload.movie,
      });
    } catch (err) {
      console.error("[MOVIES ENSURE TMDB] Error:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "LÃ¡Â»â€”i hÃ¡Â»â€¡ thÃ¡Â»â€˜ng" });
    }
  },
});
