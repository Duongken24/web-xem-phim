import { USE_TMDB } from "./constants.js";
import { supabase } from "./supabaseClient.js";

const SYSTEM_SETTINGS_TABLE = "system_settings";

export const isSystemSettingsSchemaMissingError = (error) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "42p01") {
    return true;
  }

  return (
    message.includes("system_settings") &&
    (
      message.includes("does not exist") ||
      message.includes("not found") ||
      message.includes("schema cache") ||
      message.includes("could not find the table")
    )
  );
};

const unwrapSettingValue = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("enabled" in value) return value.enabled;
    if ("use_tmdb" in value) return value.use_tmdb;
  }

  return value;
};

export const normalizeSystemSettingBoolean = (value, fallback = false) => {
  const unwrapped = unwrapSettingValue(value);

  if (typeof unwrapped === "boolean") return unwrapped;
  if (typeof unwrapped === "number") return unwrapped !== 0;

  if (typeof unwrapped === "string") {
    const normalized = unwrapped.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return Boolean(fallback);
};

export const getSystemSetting = async (key, defaultValue = null) => {
  const { data, error } = await supabase
    .from(SYSTEM_SETTINGS_TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    if (isSystemSettingsSchemaMissingError(error)) {
      return defaultValue;
    }

    throw error;
  }

  return data?.value ?? defaultValue;
};

export const setSystemSetting = async (key, value, description = null) => {
  const payload = {
    key,
    value,
    updated_at: new Date().toISOString(),
  };

  if (description !== null) {
    payload.description = description;
  }

  const { data, error } = await supabase
    .from(SYSTEM_SETTINGS_TABLE)
    .upsert(payload, { onConflict: "key" })
    .select("key, value, description, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const isTmdbEnabled = async () => {
  const value = await getSystemSetting("use_tmdb", USE_TMDB);
  return normalizeSystemSettingBoolean(value, USE_TMDB);
};
