import express from "express";
import { createUsersAdminController } from "./users.admin.controller.js";

export const createUsersAdminRoutes = (deps) => {
  const router = express.Router();
  const controller = createUsersAdminController(deps);

  router.get("/api/admin/users", controller.listUsers);
  router.post("/api/create-user", controller.createUser);
  router.patch("/api/admin/users/:userId/role", controller.updateUserRole);
  router.patch("/api/admin/users/:userId/block", controller.updateUserBlock);

  return router;
};
