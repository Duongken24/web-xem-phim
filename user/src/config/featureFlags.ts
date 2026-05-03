function resolveBooleanEnv(value: unknown, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(normalized);
}

export const USE_TMDB = resolveBooleanEnv(import.meta.env.VITE_USE_TMDB, true);
