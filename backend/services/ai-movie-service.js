import { supabase } from "../lib/supabase.js";

export const normalizeAiMovie = (movie, index = 0) => {
  const tmdbId = Number(movie.tmdb_id);
  const movieId = Number(movie.movie_id || movie.id);
  if ((!Number.isFinite(tmdbId) || tmdbId <= 0) && (!Number.isFinite(movieId) || movieId <= 0)) {
    return null;
  }

  const matchReason = Array.isArray(movie.match_reason)
    ? movie.match_reason.filter(Boolean).join(", ")
    : movie.match_reason || movie.reason || "";

  return {
    movie_id: Number.isFinite(movieId) && movieId > 0 ? movieId : null,
    tmdb_id: Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : null,
    title: movie.title || movie.original_title || `Phim gá»£i Ã½ #${index + 1}`,
    original_title: movie.original_title || null,
    slug: movie.slug || null,
    poster_path: movie.poster_path || null,
    poster_url: movie.poster_url || null,
    release_year: movie.release_year || movie.year || null,
    average_rating: Number(movie.average_rating || movie.vote_average || 0),
    score: Number(movie.score || movie.ranking_score || 0),
    reason: matchReason,
    reason_tags: Array.isArray(movie.reason_tags) ? movie.reason_tags.filter(Boolean) : [],
    source: movie.source || "ai",
    source_type: movie.source_type || null,
    has_play_source: Boolean(movie.has_play_source),
  };
};

export const getAiFallbackMovies = async (limit = 10) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));

  const { data: rankingRows, error: rankingError } = await supabase
    .from("movie_rankings")
    .select("movie_id, tmdb_id, title, original_title, poster_path, poster_url, release_year, average_rating, ranking_score")
    .not("tmdb_id", "is", null)
    .order("ranking_score", { ascending: false })
    .limit(safeLimit);

  if (!rankingError && rankingRows?.length) {
    return rankingRows
      .map((movie, index) => normalizeAiMovie({ ...movie, score: movie.ranking_score, source: "fallback" }, index))
      .filter(Boolean);
  }

  const { data: availableRows, error: availableError } = await supabase
    .from("available_movies")
    .select("id, tmdb_id, title, original_title, poster_path, poster_url, release_year, vote_average")
    .not("tmdb_id", "is", null)
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (availableError) {
    throw new Error(availableError.message);
  }

  return (availableRows || [])
    .map((movie, index) =>
      normalizeAiMovie(
        {
          ...movie,
          movie_id: movie.id,
          average_rating: movie.vote_average,
          score: 0,
          source: "fallback",
        },
        index
      )
    )
    .filter(Boolean);
};
