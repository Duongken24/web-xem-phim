import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const normalizePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const trimTrailingSlash = (value) => normalizeText(value).replace(/\/+$/, "");

const encodeObjectKey = (key) =>
  normalizeText(key)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const provider = (normalizeText(process.env.STORAGE_PROVIDER) || "r2").toLowerCase();

const getProviderEnv = () => {
  if (provider === "s3") {
    return {
      accessKeyId: normalizeText(process.env.S3_ACCESS_KEY_ID),
      secretAccessKey: normalizeText(process.env.S3_SECRET_ACCESS_KEY),
      bucketName: normalizeText(process.env.S3_BUCKET_NAME),
      endpoint: trimTrailingSlash(process.env.S3_ENDPOINT),
      publicBaseUrl: trimTrailingSlash(process.env.S3_PUBLIC_BASE_URL),
      region: normalizeText(process.env.S3_REGION) || "us-east-1",
    };
  }

  const accountId = normalizeText(process.env.R2_ACCOUNT_ID);
  const endpoint =
    trimTrailingSlash(process.env.R2_ENDPOINT) ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  return {
    accessKeyId: normalizeText(process.env.R2_ACCESS_KEY_ID),
    secretAccessKey: normalizeText(process.env.R2_SECRET_ACCESS_KEY),
    bucketName: normalizeText(process.env.R2_BUCKET_NAME),
    endpoint,
    publicBaseUrl: trimTrailingSlash(process.env.R2_PUBLIC_BASE_URL),
    region: normalizeText(process.env.R2_REGION) || "auto",
  };
};

const config = getProviderEnv();
const signedUrlTtl = normalizePositiveInteger(process.env.STORAGE_SIGNED_URL_TTL_SECONDS, 900);
const forceSignedUrls = normalizeBoolean(process.env.STORAGE_SIGNED_URLS, false);

const missingConfigKeys = Object.entries({
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  bucketName: config.bucketName,
  endpoint: provider === "r2" || config.endpoint ? config.endpoint : config.region,
}).flatMap(([key, value]) => (value ? [] : [key]));

const configured = missingConfigKeys.length === 0;

const client = configured
  ? new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  : null;

export const isStorageConfigured = () => configured;

export const getStorageConfigSummary = () => ({
  configured,
  provider,
  bucketName: config.bucketName,
  endpoint: config.endpoint,
  publicBaseUrl: config.publicBaseUrl,
  region: config.region,
  signedUrlTtl,
  forceSignedUrls,
  missingConfigKeys,
});

const requireStorage = () => {
  if (!client || !configured) {
    const error = new Error(
      `Storage chua duoc cau hinh day du. Thieu: ${missingConfigKeys.join(", ") || "unknown"}`
    );
    error.statusCode = 500;
    throw error;
  }

  return client;
};

export const getPublicUrl = (objectKey) => {
  const key = encodeObjectKey(objectKey);
  if (!key || !config.publicBaseUrl) return null;
  return `${config.publicBaseUrl}/${key}`;
};

export const createSignedObjectUrl = async ({ objectKey, expiresIn = signedUrlTtl } = {}) => {
  const key = normalizeText(objectKey);
  if (!key) return null;

  const s3 = requireStorage();
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
    { expiresIn: normalizePositiveInteger(expiresIn, signedUrlTtl) }
  );
};

export const resolveObjectUrl = async ({ objectKey, publicUrl, expiresIn = signedUrlTtl } = {}) => {
  const normalizedPublicUrl = normalizeText(publicUrl);
  const normalizedObjectKey = normalizeText(objectKey);

  if (normalizedPublicUrl && !forceSignedUrls) return normalizedPublicUrl;
  if (!normalizedObjectKey) return normalizedPublicUrl || null;

  if (forceSignedUrls || !config.publicBaseUrl) {
    return createSignedObjectUrl({ objectKey: normalizedObjectKey, expiresIn });
  }

  return getPublicUrl(normalizedObjectKey);
};

export const uploadObject = async ({
  body,
  key,
  contentType = "application/octet-stream",
  cacheControl,
  metadata,
} = {}) => {
  const objectKey = normalizeText(key);
  if (!objectKey) {
    const error = new Error("Thieu object key khi upload storage.");
    error.statusCode = 400;
    throw error;
  }

  const s3 = requireStorage();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: objectKey,
      Body: body,
      ContentType: normalizeText(contentType) || "application/octet-stream",
      CacheControl: normalizeText(cacheControl) || undefined,
      Metadata: metadata || undefined,
    })
  );

  const publicUrl = getPublicUrl(objectKey);
  const url = await resolveObjectUrl({ objectKey, publicUrl });

  return {
    success: true,
    provider,
    bucketName: config.bucketName,
    objectKey,
    publicUrl,
    url,
  };
};

export const deleteObject = async (objectKey) => {
  const key = normalizeText(objectKey);
  if (!key) return { success: true, deleted: false };

  const s3 = requireStorage();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );

  return {
    success: true,
    deleted: true,
    provider,
    bucketName: config.bucketName,
    objectKey: key,
  };
};

export const testStorageConnection = async () => {
  const summary = getStorageConfigSummary();

  if (!configured) {
    return {
      ok: false,
      ...summary,
      error: `Storage chua duoc cau hinh day du. Thieu: ${missingConfigKeys.join(", ") || "unknown"}`,
    };
  }

  try {
    const s3 = requireStorage();
    await s3.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        MaxKeys: 1,
      })
    );

    return {
      ok: true,
      ...summary,
    };
  } catch (error) {
    return {
      ok: false,
      ...summary,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
