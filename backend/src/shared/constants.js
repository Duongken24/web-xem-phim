import "./loadEnv.js";

export const PORT = Number(process.env.PORT || 5001);

export const AI_SERVICE_URL = (
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8001"
).replace(/\/$/, "");

export const MAX_UPLOAD_BYTES = Math.max(
  1024 * 1024,
  Number(process.env.MAX_UPLOAD_BYTES || 1024 * 1024 * 1024)
);

export const SIGNED_STREAM_TTL_SECONDS = Math.max(
  60,
  Math.min(
    Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS || 900),
    24 * 60 * 60
  )
);

export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "application/x-mpegurl",
  "application/vnd.apple.mpegurl",
  "video/mp2t",
]);

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SUBTITLE_MIME_TYPES = new Set(["text/vtt"]);

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  ...VIDEO_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  ...SUBTITLE_MIME_TYPES,
]);

export const ALLOWED_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://192.168.1.221:5173",
];

export const ALLOWED_CORS_ORIGIN_PATTERN = /^http:\/\/192\.168\.\d+\.\d+:517\d$/;

