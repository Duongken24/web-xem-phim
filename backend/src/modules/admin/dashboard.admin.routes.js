import express from "express";
import { createDashboardAdminController } from "./dashboard.admin.controller.js";

export const createDashboardAdminRoutes = (deps) => {
  const router = express.Router();
  const controller = createDashboardAdminController(deps);

  router.get("/api/admin/dashboard/test", controller.getDashboardTest);
  router.get("/api/admin/dashboard", controller.getDashboard);
  router.get("/api/admin/stats", controller.getStats);
  router.get("/api/admin/watch-stats", controller.getWatchStats);

  return router;
};
