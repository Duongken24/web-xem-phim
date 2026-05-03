import { Router } from "express";
import { createAnalyticsController } from "./analytics.controller.js";
import { createAnalyticsService } from "./analytics.service.js";

export const createAnalyticsRoutes = (dependencies) => {
  const router = Router();
  const service = createAnalyticsService(dependencies);
  const controller = createAnalyticsController({ service });

  router.post("/api/analytics/search", controller.trackSearch);
  router.post("/api/analytics/movie-click", controller.trackMovieClick);

  return router;
};
