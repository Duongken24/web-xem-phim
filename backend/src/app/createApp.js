import express from "express";
import { registerAppMiddleware } from "./middleware.js";

export const createApp = () => {
  const app = express();
  registerAppMiddleware(app);
  return app;
};

