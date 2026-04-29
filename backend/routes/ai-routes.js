import express from "express";
import { AI_SERVICE_URL } from "../lib/supabase.js";
import { getUserFromToken } from "../services/auth-service.js";
import { getAiFallbackMovies, normalizeAiMovie } from "../services/ai-movie-service.js";

export const aiRouter = express.Router();

aiRouter.post("/api/ai/movie-recommendations", async (req, res) => {
  const query = String(req.body?.query || "").replace(/[<>]/g, "").trim().slice(0, 240);
  const topN = Math.max(1, Math.min(Number(req.body?.top_n || req.body?.limit || 10), 20));

  if (!query) {
    return res.status(400).json({ success: false, error: "Vui lÃ²ng nháº­p nhu cáº§u xem phim." });
  }

  let user = null;
  if (req.headers.authorization) {
    user = await getUserFromToken(req);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const aiResponse = await fetch(`${AI_SERVICE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        top_n: topN,
        only_database_movies: true,
        user_id: user?.id || null,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(errorText || `AI service returned ${aiResponse.status}`);
    }

    const payload = await aiResponse.json();
    const movies = (payload.recommended_movies || [])
      .map((movie, index) => normalizeAiMovie(movie, index))
      .filter(Boolean)
      .slice(0, topN);

    if (!movies.length) {
      const fallbackMovies = await getAiFallbackMovies(topN);
      return res.json({
        success: true,
        source: "fallback",
        warning: "AI chÆ°a tÃ¬m tháº¥y phim khá»›p trong thÆ° viá»‡n, Ä‘ang dÃ¹ng phim ná»•i báº­t.",
        query,
        normalizedQuery: payload.normalized_query || query,
        detectedFilters: payload.detected_filters || {},
        movies: fallbackMovies,
      });
    }

    return res.json({
      success: true,
      source: "ai",
      query,
      normalizedQuery: payload.normalized_query || query,
      detectedFilters: payload.detected_filters || {},
      movies,
    });
  } catch (err) {
    console.warn("[AI RECOMMENDATIONS] Fallback:", err.message);

    try {
      const fallbackMovies = await getAiFallbackMovies(topN);
      return res.json({
        success: true,
        source: "fallback",
        warning: "AI service chÆ°a sáºµn sÃ ng, Ä‘ang dÃ¹ng phim ná»•i báº­t Ä‘á»ƒ gá»£i Ã½.",
        query,
        normalizedQuery: query,
        detectedFilters: {},
        movies: fallbackMovies,
      });
    } catch (fallbackError) {
      return res.status(500).json({
        success: false,
        error: fallbackError.message || err.message || "KhÃ´ng thá»ƒ láº¥y gá»£i Ã½ phim.",
      });
    }
  }
});
