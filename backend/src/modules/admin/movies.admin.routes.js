import { Router } from "express";
import { createAdminMoviesController } from "./movies.admin.controller.js";
import { createAdminMoviesService } from "./movies.admin.service.js";

export const createAdminMoviesRoutes = (dependencies) => {
  const router = Router();
  const service = createAdminMoviesService(dependencies);
  const controller = createAdminMoviesController({
    getAdminUserFromRequest: dependencies.getAdminUserFromRequest,
    service,
  });

  router.get("/api/admin/movies", controller.listMovies);
  router.get("/api/admin/movies/meta", controller.getMeta);
  router.post("/api/admin/movies", controller.createMovie);
  router.patch("/api/admin/movies/:movieId", controller.updateMovie);
  router.delete("/api/admin/movies/:movieId", controller.deleteMovie);
  router.post("/api/admin/movies/upsert", controller.upsertMovie);

  return router;
};
