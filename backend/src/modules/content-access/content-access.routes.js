import express from "express";
import { createContentAccessController } from "./content-access.controller.js";

export const createContentAccessRoutes = (deps) => {
  const router = express.Router();
  const controller = createContentAccessController(deps);

  router.get("/api/content-access/:id", controller.getContentAccess);
  router.post("/api/content-access/batch", controller.getBatchContentAccess);

  return router;
};
