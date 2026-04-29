export const createAiController = (service) => ({
  async movieRecommendations(req, res) {
    try {
      const payload = await service.getMovieRecommendations(req);
      return res.json(payload);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the lay goi y phim.",
      });
    }
  },

  async personalizedRecommendations(req, res) {
    try {
      const payload = await service.getPersonalizedRecommendations(req);
      return res.json(payload);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || "Khong the lay goi y phim.",
      });
    }
  },
});
