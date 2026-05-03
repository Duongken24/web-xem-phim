import { normalizeInteger, normalizeText } from "../../shared/normalize.js";
import { supabase } from "../../shared/supabaseClient.js";

const sanitizeFreeText = (value, maxLength = 240) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/[<>]/g, "").slice(0, maxLength) : null;
};

const isAnalyticsSchemaMissingError = (error) => {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (code === "42p01" || code === "42703") {
    return true;
  }

  return (
    (message.includes("search_logs") || message.includes("movie_click_logs")) &&
    (
      message.includes("does not exist") ||
      message.includes("not found") ||
      message.includes("column") ||
      message.includes("could not find the table") ||
      message.includes("schema cache")
    )
  );
};

const buildSearchLogPayload = (body, userId = null) => ({
  user_id: userId,
  query: sanitizeFreeText(body?.query, 240),
  normalized_query: sanitizeFreeText(body?.normalized_query, 240),
  source_page: sanitizeFreeText(body?.source_page, 120),
  filters_json:
    body?.filters_json && typeof body.filters_json === "object"
      ? body.filters_json
      : null,
  result_count: normalizeInteger(body?.result_count),
  clicked_movie_id: normalizeInteger(body?.clicked_movie_id),
});

const buildMovieClickLogPayload = (body, userId = null) => ({
  user_id: userId,
  movie_id: normalizeInteger(body?.movie_id),
  source_page: sanitizeFreeText(body?.source_page, 120),
  source_module: sanitizeFreeText(body?.source_module, 120),
  query_text: sanitizeFreeText(body?.query_text, 240),
  recommendation_source: sanitizeFreeText(body?.recommendation_source, 120),
  rank_position: normalizeInteger(body?.rank_position),
  session_id: sanitizeFreeText(body?.session_id, 120),
});

export const createAnalyticsService = ({ getOptionalUserFromToken }) => ({
  isAnalyticsSchemaMissingError,

  async trackSearch(req) {
    const user = await getOptionalUserFromToken(req);
    const payload = buildSearchLogPayload(req.body || {}, user?.id || null);

    if (!payload.query) {
      const err = new Error("query bat buoc");
      err.statusCode = 400;
      throw err;
    }

    const { error } = await supabase.from("search_logs").insert(payload);
    if (error) throw error;

    return { success: true, logged: true };
  },

  async trackMovieClick(req) {
    const user = await getOptionalUserFromToken(req);
    const payload = buildMovieClickLogPayload(req.body || {}, user?.id || null);

    if (!payload.movie_id) {
      const err = new Error("movie_id bat buoc");
      err.statusCode = 400;
      throw err;
    }

    const { error } = await supabase.from("movie_click_logs").insert(payload);
    if (error) throw error;

    return { success: true, logged: true };
  },
});
