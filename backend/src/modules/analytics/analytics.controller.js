const ANALYTICS_SCHEMA_MESSAGE =
  "Analytics tables chua san sang. Hay chay migration search_logs/movie_click_logs truoc.";

export const createAnalyticsController = ({ service }) => ({
  async trackSearch(req, res) {
    try {
      const payload = await service.trackSearch(req);
      return res.json(payload);
    } catch (err) {
      console.error("[ANALYTICS SEARCH] Error:", err.message);

      if (service.isAnalyticsSchemaMissingError(err)) {
        return res.status(503).json({
          success: false,
          error: ANALYTICS_SCHEMA_MESSAGE,
        });
      }

      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "Khong the ghi search log." });
    }
  },

  async trackMovieClick(req, res) {
    try {
      const payload = await service.trackMovieClick(req);
      return res.json(payload);
    } catch (err) {
      console.error("[ANALYTICS MOVIE CLICK] Error:", err.message);

      if (service.isAnalyticsSchemaMissingError(err)) {
        return res.status(503).json({
          success: false,
          error: ANALYTICS_SCHEMA_MESSAGE,
        });
      }

      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "Khong the ghi movie click log." });
    }
  },
});
