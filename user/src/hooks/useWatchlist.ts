import { useState, useEffect, useCallback } from 'react';
import * as SupabaseService from '../services/supabase.service';
import CatalogService, { type CatalogMovie } from '../services/catalog.service';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovieDetail } from '../types/tmdb.types';
import { useCurrentUser } from './useAuth';

type WatchlistMovie = TMDBMovieDetail & {
  catalogId?: number;
  hasPlaySource?: boolean;
};

function normalizeMovieId(movieId: number | string) {
  const parsed = typeof movieId === 'number' ? movieId : Number(movieId);
  return Number.isFinite(parsed) ? parsed : null;
}

function mergeTMDBWithCatalog(
  tmdbMovie: TMDBMovieDetail,
  catalogMovie?: { id: number; has_play_source?: boolean } | null
): WatchlistMovie {
  return {
    ...tmdbMovie,
    catalogId: catalogMovie?.id,
    hasPlaySource: Boolean(catalogMovie?.has_play_source),
  };
}

function mapCatalogMovieToWatchlistMovie(catalogMovie: CatalogMovie): WatchlistMovie {
  const releaseDate =
    catalogMovie.release_date || (catalogMovie.release_year ? `${catalogMovie.release_year}-01-01` : '');

  return {
    id: catalogMovie.tmdb_id || catalogMovie.id,
    adult: false,
    backdrop_path: catalogMovie.backdrop_url || catalogMovie.backdrop_path || catalogMovie.poster_url || catalogMovie.poster_path,
    genres: [],
    genre_ids: [],
    homepage: '',
    imdb_id: '',
    original_language: 'vi',
    original_title: catalogMovie.original_title || catalogMovie.title,
    overview: catalogMovie.overview || '',
    popularity: 0,
    poster_path: catalogMovie.poster_url || catalogMovie.poster_path,
    production_companies: [],
    production_countries: [],
    release_date: releaseDate,
    revenue: 0,
    runtime: catalogMovie.runtime_minutes || 0,
    status: catalogMovie.status || 'active',
    tagline: '',
    title: catalogMovie.title,
    video: false,
    vote_average: catalogMovie.vote_average || 0,
    vote_count: catalogMovie.vote_count || 0,
    budget: 0,
    catalogId: catalogMovie.id,
    hasPlaySource: Boolean(catalogMovie.has_play_source),
  };
}

/**
 * Public route ids stay as TMDB ids, but favorites.movie_id stores public.movies.id.
 */
export function useWatchlist() {
  const { user } = useCurrentUser();
  const [movieIds, setMovieIds] = useState<number[]>([]);
  const [tmdbIds, setTmdbIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<WatchlistMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setMovieIds([]);
      setTmdbIds([]);
      setMovies([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { movieIds: ids, error: fetchError } = await SupabaseService.getWatchlist(user.id);

      if (fetchError) {
        setError(fetchError);
        setMovieIds([]);
        setTmdbIds([]);
        setMovies([]);
        return;
      }

      setMovieIds(ids);

      if (ids.length === 0) {
        setTmdbIds([]);
        setMovies([]);
        return;
      }

      const catalogMovies = await CatalogService.getMoviesByInternalIds(ids);
      const nextTmdbIds = catalogMovies
        .map((movie) => movie.tmdb_id)
        .filter((id): id is number => typeof id === 'number');

      setTmdbIds(nextTmdbIds);

      const details = await Promise.all(
        catalogMovies.map(async (catalogMovie) => {
          if (!catalogMovie.tmdb_id) {
            return mapCatalogMovieToWatchlistMovie(catalogMovie);
          }

          try {
            const movieDetail = await TMDBService.getMovieDetails(catalogMovie.tmdb_id);
            return mergeTMDBWithCatalog(movieDetail, catalogMovie);
          } catch {
            return mapCatalogMovieToWatchlistMovie(catalogMovie);
          }
        })
      );

      setMovies(details.filter((item): item is WatchlistMovie => item !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist');
      setMovieIds([]);
      setTmdbIds([]);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addToWatchlist = async (movieOrId: TMDBMovieDetail | number | string) => {
    if (!user) {
      setError('Vui lòng đăng nhập để thêm phim vào danh sách.');
      return { success: false, error: 'Please login to add to watchlist' };
    }

    setError(null);

    const tmdbId = typeof movieOrId === 'object' ? movieOrId.id : normalizeMovieId(movieOrId);
    if (!tmdbId) {
      setError('Không xác định được phim để thêm vào danh sách.');
      return { success: false, error: 'Invalid TMDB movie id' };
    }

    try {
      const movieDetail =
        typeof movieOrId === 'object' ? movieOrId : await TMDBService.getMovieDetails(tmdbId);
      const { movie: catalogMovie, error: catalogError } = await CatalogService.ensureMovieFromTMDB(movieDetail);

      if (!catalogMovie) {
        return { success: false, error: catalogError || 'Movie mapping not found' };
      }

      const result = await SupabaseService.addToWatchlist(user.id, catalogMovie.id);

      if (result.success) {
        setError(null);
        setMovieIds((prev) => (prev.includes(catalogMovie.id) ? prev : [catalogMovie.id, ...prev]));
        setTmdbIds((prev) => (prev.includes(tmdbId) ? prev : [tmdbId, ...prev]));
        setMovies((prev) => {
          if (prev.some((movie) => movie.id === tmdbId)) return prev;
          return [mergeTMDBWithCatalog(movieDetail, catalogMovie), ...prev];
        });
      } else {
        setError(result.error || 'Không thể thêm phim vào danh sách.');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to watchlist';
      setError(message);
      return {
        success: false,
        error: message,
      };
    }
  };

  const removeFromWatchlist = async (movieOrId: TMDBMovieDetail | number | string) => {
    if (!user) {
      setError('Vui lòng đăng nhập để cập nhật danh sách.');
      return { success: false, error: 'User not authenticated' };
    }

    setError(null);

    const tmdbId = typeof movieOrId === 'object' ? movieOrId.id : normalizeMovieId(movieOrId);
    if (!tmdbId) {
      setError('Không xác định được phim để xóa khỏi danh sách.');
      return { success: false, error: 'Invalid TMDB movie id' };
    }

    try {
      const existingMovie = movies.find((movie) => movie.id === tmdbId);
      let catalogId = existingMovie?.catalogId;

      if (!catalogId) {
        const { movie: catalogMovie } = await CatalogService.getMovieByTmdbId(tmdbId);
        catalogId = catalogMovie?.id;
      }

      if (!catalogId) {
        setTmdbIds((prev) => prev.filter((id) => id !== tmdbId));
        setMovies((prev) => prev.filter((movie) => movie.id !== tmdbId));
        return { success: true };
      }

      const result = await SupabaseService.removeFromWatchlist(user.id, catalogId);

      if (result.success) {
        setError(null);
        setMovieIds((prev) => prev.filter((id) => id !== catalogId));
        setTmdbIds((prev) => prev.filter((id) => id !== tmdbId));
        setMovies((prev) => prev.filter((movie) => movie.id !== tmdbId));
      } else {
        setError(result.error || 'Không thể xóa phim khỏi danh sách.');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove from watchlist';
      setError(message);
      return { success: false, error: message };
    }
  };

  const isInWatchlist = (movieId: number | string) => {
    const normalizedId = normalizeMovieId(movieId);
    return normalizedId ? tmdbIds.includes(normalizedId) : false;
  };

  const toggleWatchlist = async (movieOrId: TMDBMovieDetail | number | string) => {
    const tmdbId = typeof movieOrId === 'object' ? movieOrId.id : normalizeMovieId(movieOrId);

    if (tmdbId && isInWatchlist(tmdbId)) {
      return removeFromWatchlist(movieOrId);
    }

    return addToWatchlist(movieOrId);
  };

  return {
    movieIds,
    tmdbIds,
    movies,
    loading,
    error,
    refreshWatchlist: fetchWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
  };
}

export function useIsInWatchlist(movieId: number | string) {
  const { user } = useCurrentUser();
  const [isInList, setIsInList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const tmdbId = normalizeMovieId(movieId);

    if (!user || !tmdbId) {
      setIsInList(false);
      setLoading(false);
      return;
    }

    const checkWatchlist = async () => {
      setLoading(true);
      try {
        const { movie: catalogMovie } = await CatalogService.getMovieByTmdbId(tmdbId);
        const isSaved = catalogMovie ? await SupabaseService.isInWatchlist(user.id, catalogMovie.id) : false;

        if (isMounted) {
          setIsInList(isSaved);
        }
      } catch {
        if (isMounted) {
          setIsInList(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void checkWatchlist();

    return () => {
      isMounted = false;
    };
  }, [user, movieId]);

  return { isInList, loading };
}
