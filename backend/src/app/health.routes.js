import { Router } from "express";

export const createHealthRoutes = () => {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ status: "OK", message: "Server Ä‘ang cháº¡y tá»‘t!" });
  });

  return router;
};
