import cors from "cors";
import express from "express";
import {
  ALLOWED_CORS_ORIGINS,
  ALLOWED_CORS_ORIGIN_PATTERN,
} from "../shared/constants.js";
import { jsonSyntaxErrorHandler } from "./errorHandler.js";

export const registerAppMiddleware = (app) => {
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (
          ALLOWED_CORS_ORIGINS.includes(origin) ||
          ALLOWED_CORS_ORIGIN_PATTERN.test(origin)
        ) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(jsonSyntaxErrorHandler);
};

