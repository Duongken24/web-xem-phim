import { Router } from "express";
import { createAdminStorageController } from "./storage.admin.controller.js";
import { createAdminStorageService } from "./storage.admin.service.js";

export const createAdminStorageRoutes = (dependencies) => {
  const router = Router();
  const service = createAdminStorageService(dependencies);
  const controller = createAdminStorageController({
    getAdminUserFromRequest: dependencies.getAdminUserFromRequest,
    runSingleUpload: dependencies.runSingleUpload,
    service,
  });

  router.get("/api/admin/storage/health", controller.getStorageHealth);
  router.post("/api/admin/movies/:movieId/sources", controller.createSource);
  router.post("/api/admin/movies/:movieId/episodes", controller.createEpisode);
  router.post("/api/admin/movies/:movieId/upload-video", controller.uploadMovieVideo);
  router.delete("/api/admin/sources/:sourceId", controller.deleteSource);
  router.post("/api/admin/episodes/:episodeId/upload-video", controller.uploadEpisodeVideo);

  return router;
};
