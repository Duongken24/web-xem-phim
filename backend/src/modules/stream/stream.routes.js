import { Router } from "express";
import { createStreamController } from "./stream.controller.js";

export const createStreamRoutes = ({ service, getUserFromToken }) => {
  const router = Router();
  const controller = createStreamController({ service, getUserFromToken });

  router.get("/api/stream/:tmdbId", controller.streamByTmdbId);
  router.get("/api/stream/movie/:movieId", controller.streamByMovieId);

  return router;
};
