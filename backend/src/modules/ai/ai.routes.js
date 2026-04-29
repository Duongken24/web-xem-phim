import { Router } from "express";
import { createAiController } from "./ai.controller.js";
import { createAiService } from "./ai.service.js";

export const createAiRoutes = (dependencies) => {
  const router = Router();
  const service = createAiService(dependencies);
  const controller = createAiController(service);

  router.post("/movie-recommendations", controller.movieRecommendations);
  router.post("/movie-recommendations/personalized", controller.personalizedRecommendations);

  return router;
};
