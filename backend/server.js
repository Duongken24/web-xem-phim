import express from "express";
import cors from "cors";
import multer from "multer";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  PORT,
  USE_TMDB,
} from "./src/shared/constants.js";
import { createApplicationRoutes } from "./src/app/applicationRoutes.js";
import { registerRoutes } from "./src/app/routes.js";
import { startServer } from "./src/server.js";
import { createStreamService } from "./src/modules/stream/stream.service.js";

const defaultStorageSummary = () => ({
  configured: false,
  provider: "",
  bucketName: "",
  endpoint: "",
  publicBaseUrl: "",
  region: "",
  signedUrlTtl: 900,
  forceSignedUrls: false,
});

let deleteObject = async () => ({ success: false, deleted: false });
let getPublicUrl = () => null;
let getStorageConfigSummary = () => defaultStorageSummary();
let isStorageConfigured = () => false;
let resolveObjectUrl = async ({ publicUrl }) => publicUrl || null;
let testStorageConnection = async () => ({
  ok: false,
  ...defaultStorageSummary(),
  error: "Storage service unavailable.",
});
let uploadObject = async () => {
  throw new Error("Storage service unavailable.");
};

try {
  ({
    deleteObject,
    getPublicUrl,
    getStorageConfigSummary,
    isStorageConfigured,
    resolveObjectUrl,
    testStorageConnection,
    uploadObject,
  } = await import("./services/storageService.js"));
} catch (error) {
  console.warn(
    "[STORAGE] Storage service disabled. Admin CRUD cÅ© váº«n cháº¡y, nhÆ°ng upload/storage API sáº½ táº¡m thá»i khÃ´ng kháº£ dá»¥ng:",
    error instanceof Error ? error.message : error
  );
}

const streamService = createStreamService({ resolveObjectUrl });
const app = express();
// ================= MIDDLEWARE =================
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://192.168.1.221:5173",
      "https://web-xem-phim-aoo8yx9p0-tinduongai-3911s-projects.vercel.app",
    ];

    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/192\.168\.\d+\.\d+:517\d$/.test(origin) ||
      /^https:\/\/web-xem-phim(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ success: false, error: "Dá»¯ liá»‡u gá»­i lÃªn backend khÃ´ng há»£p lá»‡." });
  }

  next(err);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      return callback(new Error(`File type khÃ´ng Ä‘Æ°á»£c há»— trá»£: ${file.mimetype || "unknown"}`));
    }

    callback(null, true);
  },
});

const runSingleUpload = (req, res, fieldName) =>
  new Promise((resolve, reject) => {
    upload.single(fieldName)(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(req.file || null);
    });
  });

// ================= ROUTES =================

registerRoutes(app, createApplicationRoutes({
  deleteObject,
  getPublicUrl,
  getStorageConfigSummary,
  isStorageConfigured,
  runSingleUpload,
  streamService,
  testStorageConnection,
  uploadObject,
  useTmdbFallback: USE_TMDB,
}));

// ================= START SERVER =================
const shouldListen = process.env.DISABLE_SERVER_LISTEN !== "1";
const server = shouldListen
  ? startServer(app, PORT, () => {
      console.log(`ðŸš€ Server cháº¡y táº¡i http://localhost:${PORT}`);
      console.log(`ðŸ“‹ Routes:`);
      console.log(`   GET /                              - Health check`);
      console.log(`   GET /api/movies                    - Danh sÃ¡ch phim`);
      console.log(`   GET /api/movies/:movieId/similar   - Similar movies by internal id`);
      console.log(`   GET /api/stream/:tmdbId            - Stream link by TMDB id`);
      console.log(`   POST /api/movies/ensure-tmdb       - Auto map TMDB movie`);
      console.log(`   POST /api/ai/movie-recommendations - AI movie recommendations`);
      console.log(`   POST /api/ai/movie-recommendations/personalized - Personalized AI movie recommendations`);
      console.log(`   GET /api/admin/dashboard/test      - Test endpoint (no auth)`);
      console.log(`   GET /api/admin/dashboard           - Admin dashboard`);
      console.log(`   GET /api/admin/movies              - List admin movies`);
      console.log(`   POST /api/admin/movies/upsert      - Upsert admin movie`);
      console.log(`   GET /api/admin/stats               - Admin stats`);
      console.log(`   GET /api/admin/users               - List users`);
      console.log(`   GET /api/admin/plans               - List plans`);
      console.log(`   GET /api/admin/subscriptions       - List subscriptions`);
      console.log(`   GET /api/admin/content             - List content controls`);
      console.log(`   GET /api/admin/watch-stats         - Watch statistics`);
      console.log(`   POST /api/create-user              - Create admin user`);
      console.log(`   PATCH /api/admin/users/:userId/role - Update user role`);
      console.log(`   PATCH /api/admin/users/:userId/block - Block/unblock user`);
      console.log(`   POST /api/admin/plans              - Create plan`);
      console.log(`   PATCH /api/admin/plans/:planId     - Update plan`);
      console.log(`   POST /api/admin/subscriptions/assign - Assign subscription`);
      console.log(`   PATCH /api/admin/subscriptions/:id - Update subscription`);
      console.log(`   POST /api/admin/content/upsert     - Upsert content control`);
    })
  : null;

// Keep one active handle so the process does not exit immediately in shells
// that detach the HTTP server from the foreground session unexpectedly.
const processKeepAlive = shouldListen ? setInterval(() => {}, 60 * 60 * 1000) : null;

const shutdownServer = (signal) => {
  console.log(`[SERVER] Received ${signal}. Shutting down backend...`);
  if (processKeepAlive) {
    clearInterval(processKeepAlive);
  }

  if (!server) {
    process.exit(0);
    return;
  }

  if (!server.listening) {
    process.exit(0);
    return;
  }

  server.close((error) => {
    if (error) {
      if (error.message === "Server is not running.") {
        process.exit(0);
        return;
      }

      console.error("[SERVER] Error while closing:", error.message);
      process.exit(1);
      return;
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error("[SERVER] Forced shutdown after timeout.");
    process.exit(1);
  }, 5000).unref();
};

process.on("SIGINT", () => shutdownServer("SIGINT"));
process.on("SIGTERM", () => shutdownServer("SIGTERM"));

export { app };

