import { Router } from "express";
import { createMoviesController } from "./movies.controller.js";
import { createMoviesService } from "./movies.service.js";

export const createMoviesRoutes = (dependencies) => {
  const router = Router();
  const service = createMoviesService(dependencies);
  const controller = createMoviesController({
    service,
    getUserFromToken: dependencies.getUserFromToken,
  });

  router.get("/api/movies", controller.listMovies);
  router.get("/api/movies/by-tmdb/:tmdbId", controller.getByTmdbId);
  router.get("/api/movies/:movieId/similar", controller.similarMovies);
  router.post("/api/movies/ensure-tmdb", controller.ensureTmdb);

  return router;
};
