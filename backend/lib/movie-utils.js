export const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

export const normalizeInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
