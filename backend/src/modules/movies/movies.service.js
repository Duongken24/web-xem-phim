import { mapMovieWithPlaySource } from "./movies.mapper.js";
import {
  buildTmdbMoviePayload,
  createSimilarMoviesHelper,
} from "../../shared/movies-helpers.js";

const normalizeInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

export const createMoviesService = ({
  buildSimilarMovieProfile,
  getAdminMoviesPayload,
  getHasPlaySource,
  getRecommendationCatalog,
  scoreSimilarMovieCandidate,
  streamService,
  supabase,
}) => {
  const getSimilarMoviesByMovieId = createSimilarMoviesHelper({
    buildSimilarMovieProfile,
    getRecommendationCatalog,
    scoreSimilarMovieCandidate,
  });

  return {
    async listPublicMovies(filters = {}) {
      const movies = await getAdminMoviesPayload();
      const genreId = normalizeInteger(filters.genreId);
      const year = normalizeInteger(filters.year);
      const type = typeof filters.type === "string" ? filters.type.trim().toLowerCase() : "";
      const wantsTrending = String(filters.trending || "").toLowerCase() === "true";
      const wantsFeatured = String(filters.featured || "").toLowerCase() === "true";

      let acceptedGenreIds = genreId ? [genreId] : [];
      if (genreId) {
        const { data: genreRows, error: genreError } = await supabase
          .from("genres")
          .select("id")
          .or(`id.eq.${genreId},tmdb_genre_id.eq.${genreId}`);

        if (genreError) {
          throw new Error(genreError.message);
        }

        acceptedGenreIds = (genreRows || [])
          .map((genre) => Number(genre.id))
          .filter((id) => Number.isInteger(id) && id > 0);
      }

      return movies.filter((movie) => {
        if (movie.is_active === false || (movie.status || "active") !== "active" || movie.deleted_at) return false;
        if (genreId && !(Array.isArray(movie.genres) && movie.genres.map(Number).some((id) => acceptedGenreIds.includes(id)))) return false;
        if (year && Number(movie.release_year) !== year) return false;
        if (type && movie.type !== type) return false;
        if (wantsTrending && !movie.is_trending) return false;
        if (wantsFeatured && !(movie.is_featured || movie.content_control?.is_featured)) return false;
        return true;
      });
    },

    async getMovieByTmdbId(tmdbId) {
      const { movie, source } = await streamService.getMovieSourceByTmdbId(tmdbId);
      return mapMovieWithPlaySource(movie, source);
    },

    async getSimilarMovies({ movieId, limit }) {
      return getSimilarMoviesByMovieId({ movieId, limit });
    },

    async ensureTmdbMovie(body) {
      const insertPayload = buildTmdbMoviePayload(body || {}, true);
      const updatePayload = buildTmdbMoviePayload(body || {}, false);

      const { data: existingMovie, error: existingError } = await supabase
        .from("movies")
        .select("id")
        .eq("tmdb_id", insertPayload.tmdb_id)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      let movie;
      let action;
      let dbError;

      if (existingMovie) {
        action = "updated";
        const result = await supabase
          .from("movies")
          .update(updatePayload)
          .eq("id", existingMovie.id)
          .select("*")
          .single();

        movie = result.data;
        dbError = result.error;
      } else {
        action = "inserted";
        const result = await supabase
          .from("movies")
          .insert(insertPayload)
          .select("*")
          .single();

        movie = result.data;
        dbError = result.error;
      }

      if (dbError) {
        throw new Error(dbError.message);
      }

      const hasPlaySource = await getHasPlaySource(movie);

      return {
        action,
        movie: {
          ...movie,
          has_play_source: hasPlaySource,
        },
      };
    },
  };
};
