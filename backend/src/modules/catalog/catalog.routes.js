import { Router } from "express";
import { createCatalogController } from "./catalog.controller.js";

export const createCatalogRoutes = (deps) => {
  const router = Router();
  const controller = createCatalogController(deps);

  router.get("/api/genres", controller.listGenres);
  router.get("/api/years", controller.listYears);

  return router;
};
