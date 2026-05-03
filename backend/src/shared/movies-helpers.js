import { normalizeInteger, normalizeNumber, normalizeText } from "./normalize.js";

export const getReleaseYear = (releaseDate) => {
  const normalizedDate = normalizeText(releaseDate);
  if (!normalizedDate) return null;

  const parsed = new Date(normalizedDate);
  const year = parsed.getFullYear();
  return Number.isFinite(year) ? year : null;
};

export const createMovieSlug = (title, tmdbId) => {
  const base = normalizeText(title) || `movie-${tmdbId}`;
  const slugBase = base
    .toLowerCase()
    .replace(/Ä‘/g, "d")
    .replace(/Ä/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slugBase || "movie"}-${tmdbId}`;
};

export const buildTmdbMoviePayload = (body, includeDefaults = false) => {
  const tmdbId = normalizeInteger(body?.tmdb_id ?? body?.id);
  const releaseDate = normalizeText(body?.release_date);
  const releaseYear = normalizeInteger(body?.release_year) ?? getReleaseYear(releaseDate);
  const runtime = normalizeInteger(body?.runtime_minutes ?? body?.runtime);
  const title = normalizeText(body?.title) || normalizeText(body?.original_title);
  const originCountry = Array.isArray(body?.production_countries)
    ? normalizeText(body.production_countries[0]?.iso_3166_1)
    : normalizeText(body?.origin_country);

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    const err = new Error("tmdb_id khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡");
    err.statusCode = 400;
    throw err;
  }

  if (!title) {
    const err = new Error("ThiÃ¡ÂºÂ¿u tÃƒÂªn phim");
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    tmdb_id: tmdbId,
    slug: createMovieSlug(title, tmdbId),
    title,
    original_title: normalizeText(body?.original_title),
    overview: normalizeText(body?.overview),
    poster_path: normalizeText(body?.poster_path),
    backdrop_path: normalizeText(body?.backdrop_path),
    release_date: releaseDate,
    release_year: releaseYear,
    runtime_minutes: runtime,
    vote_average: normalizeNumber(body?.vote_average),
    vote_count: normalizeInteger(body?.vote_count),
    original_language: normalizeText(body?.original_language),
    origin_country: originCountry,
    tmdb_synced_at: new Date().toISOString(),
  };

  if (!includeDefaults) return payload;

  return {
    ...payload,
    source_type: "tmdb",
    status: "active",
    is_active: true,
    is_featured: false,
    is_premium: false,
  };
};

export const createSimilarMoviesHelper = ({
  buildSimilarMovieProfile,
  getRecommendationCatalog,
  scoreSimilarMovieCandidate,
}) => async ({ movieId, limit = 10 }) => {
  const normalizedMovieId = normalizeInteger(movieId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 24));
  if (!normalizedMovieId) {
    const err = new Error("movieId khong hop le");
    err.statusCode = 400;
    throw err;
  }

  const catalog = await getRecommendationCatalog();
  const similarProfile = await buildSimilarMovieProfile(normalizedMovieId, catalog);

  const items = catalog
    .map((candidateMovie) => {
      const ranking = scoreSimilarMovieCandidate({
        targetMovie: similarProfile.targetMovie,
        candidateMovie,
        similarProfile,
      });

      if (!ranking || ranking.rawScore <= 0) return null;

      return {
        id: candidateMovie.id,
        tmdb_id: candidateMovie.tmdb_id || null,
        title: candidateMovie.title,
        original_title: candidateMovie.original_title || null,
        slug: candidateMovie.slug || null,
        poster_url: candidateMovie.poster_url || candidateMovie.image_url || candidateMovie.poster_path || null,
        poster_path: candidateMovie.poster_path || null,
        source_type: candidateMovie.source_type || null,
        has_play_source: Boolean(candidateMovie.has_play_source),
        similarity_score: ranking.similarityScore,
        reason_tags: ranking.reasonTags,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, safeLimit);

  return {
    movie: similarProfile.targetMovie,
    items,
  };
};
