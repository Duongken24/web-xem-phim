import { Router } from "express";
import { createSettingsController } from "./settings.controller.js";
import { createSettingsService } from "./settings.service.js";

export const createSettingsRoutes = (dependencies) => {
  const router = Router();
  const service = createSettingsService(dependencies);
  const controller = createSettingsController({
    service,
    isSystemSettingsSchemaMissingError: dependencies.isSystemSettingsSchemaMissingError,
    useTmdbFallback: dependencies.useTmdbFallback,
  });

  router.get("/api/settings/public", controller.publicSettings);
  router.get("/api/admin/settings", controller.adminSettings);
  router.patch("/api/admin/settings/use-tmdb", controller.updateUseTmdb);

  return router;
};
