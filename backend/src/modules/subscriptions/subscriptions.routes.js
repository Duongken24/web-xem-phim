import express from "express";
import { createSubscriptionsController } from "./subscriptions.controller.js";

export const createSubscriptionsRoutes = (deps) => {
  const router = express.Router();
  const controller = createSubscriptionsController(deps);

  router.get("/api/subscriptions/plans", controller.listPlans);
  router.get("/api/subscriptions/me", controller.getCurrentSubscription);

  return router;
};
