import { Router } from "express";
import { createAiController } from "./ai.controller.js";
import { createAiService } from "./ai.service.js";

export const createAiRoutes = (dependencies) => {
  const router = Router();
  const service = createAiService(dependencies);
  const controller = createAiController(service);
  const basePath = dependencies.basePath || "/api/ai";

  router.post(`${basePath}/recommend`, controller.recommend);
  router.post(`${basePath}/movie-recommendations`, controller.movieRecommendations);
  router.post(`${basePath}/movie-recommendations/personalized`, controller.personalizedRecommendations);

  return router;
};
