import express from "express";
import { createPlansAdminController } from "./plans.admin.controller.js";

export const createPlansAdminRoutes = (deps) => {
  const router = express.Router();
  const controller = createPlansAdminController(deps);

  router.get("/api/admin/plans", controller.listPlans);
  router.post("/api/admin/plans", controller.createPlan);
  router.patch("/api/admin/plans/:planId", controller.updatePlan);
  router.get("/api/admin/subscriptions", controller.listSubscriptions);
  router.post("/api/admin/subscriptions/assign", controller.assignSubscription);
  router.patch("/api/admin/subscriptions/:subscriptionId", controller.updateSubscription);

  return router;
};
