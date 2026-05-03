import express from "express";
import { createContentAdminController } from "./content.admin.controller.js";

export const createContentAdminRoutes = (deps) => {
  const router = express.Router();
  const controller = createContentAdminController(deps);

  router.get("/api/admin/content", controller.listContent);
  router.post("/api/admin/content/upsert", controller.upsertContent);

  return router;
};
