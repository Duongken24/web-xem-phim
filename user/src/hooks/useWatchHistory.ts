import { useState, useEffect, useCallback, useRef } from 'react';
import * as SupabaseService from '../services/supabase.service';
import CatalogService, { type CatalogMovie } from '../services/catalog.service';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovie } from '../types/tmdb.types';
import { useCurrentUser } from './useAuth';
import { WATCH_THRESHOLDS } from '../utils/constants';

export interface WatchHistoryMovie extends TMDBMovie {
  internalMovieId: number;
  tmdbId: number | null;
  episodeId: number | null;
  hasPlaySource: boolean;
  progress: number;
  watchPosition: number;
  duration: number;
  progressPercent: number;
  lastWatchedAt: string;
}

function toProgressPercent(watchPosition: number, duration: number, progress: number) {
  return duration > 0
    ? Math.min(100, Math.max(0, Math.round((watchPosition / duration) * 100)))
    : progress;
}

function mapCatalogMovieToHistoryMovie(
  catalogMovie: CatalogMovie,
  item: {
    movie_id: number;
    episode_id?: number | null;
    progress: number;
    watch_position: number;
    duration: number;
    last_watched_at: string;
  }
): WatchHistoryMovie {
  const releaseDate =
    catalogMovie.release_date || (catalogMovie.release_year ? `${catalogMovie.release_year}-01-01` : '');
  const progressPercent = toProgressPercent(item.watch_position, item.duration, item.progress);

  return {
    id: catalogMovie.tmdb_id || catalogMovie.id,
    adult: false,
    backdrop_path: catalogMovie.backdrop_url || catalogMovie.backdrop_path,
    genre_ids: [],
    original_language: 'vi',
    original_title: catalogMovie.original_title || catalogMovie.title,
    overview: catalogMovie.overview || '',
    popularity: 0,
    poster_path: catalogMovie.poster_url || catalogMovie.poster_path,
    release_date: releaseDate,
    title: catalogMovie.title,
    video: false,
    vote_average: catalogMovie.vote_average || 0,
    vote_count: catalogMovie.vote_count || 0,
    internalMovieId: catalogMovie.id,
    tmdbId: catalogMovie.tmdb_id,
    episodeId: item.episode_id ?? null,
    hasPlaySource: Boolean(catalogMovie.has_play_source),
    progress: item.progress,
    watchPosition: item.watch_position,
    duration: item.duration,
    progressPercent,
    lastWatchedAt: item.last_watched_at,
  };
}

/**
 * useWatchHistory Hook
 * Manages user's watch history with auto-save functionality
 */
export function useWatchHistory() {
  const { user } = useCurrentUser();
  const [historyItems, setHistoryItems] = useState<WatchHistoryMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch watch history
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistoryItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { items, error: fetchError } = await SupabaseService.getWatchHistory(user.id, 20);

      if (fetchError) {
        setHistoryItems([]);
        setError(fetchError);
        setLoading(false);
        return;
      }

      if (items.length > 0) {
        const catalogMovies = await CatalogService.getMoviesByInternalIds(items.map((item) => item.movie_id));
        const catalogById = new Map(catalogMovies.map((movie) => [movie.id, movie]));

        const moviePromises = items.map(async (item) => {
          try {
            const catalogMovie = catalogById.get(item.movie_id);
            if (!catalogMovie) return null;

            const tmdbId = catalogMovie.tmdb_id;

            if (!tmdbId) {
              return mapCatalogMovieToHistoryMovie(catalogMovie, item);
            }

            const movie = await TMDBService.getMovieDetails(tmdbId);
            const progressPercent = toProgressPercent(item.watch_position, item.duration, item.progress);

            return {
              ...movie,
              internalMovieId: catalogMovie.id,
              tmdbId: catalogMovie.tmdb_id,
              episodeId: item.episode_id ?? null,
              hasPlaySource: Boolean(catalogMovie.has_play_source),
              progress: item.progress,
              watchPosition: item.watch_position,
              duration: item.duration,
              progressPercent,
              lastWatchedAt: item.last_watched_at,
            } as WatchHistoryMovie;
          } catch {
            const catalogMovie = catalogById.get(item.movie_id);
            return catalogMovie ? mapCatalogMovieToHistoryMovie(catalogMovie, item) : null;
          }
        });

        const movies = await Promise.all(moviePromises);
        const validMovies = movies.filter((m): m is WatchHistoryMovie => m !== null);

        if (validMovies.length === 0) {
          setHistoryItems([]);
          setLoading(false);
          return;
        }

        setHistoryItems(validMovies);
      } else {
        setHistoryItems([]);
      }
    } catch (err: any) {
      setHistoryItems([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load history on mount and user change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const continueWatching = [...historyItems]
    .filter(
      (movie) =>
        movie.progressPercent >= WATCH_THRESHOLDS.CONTINUE_WATCHING &&
        movie.progressPercent < WATCH_THRESHOLDS.CONSIDERED_WATCHED
    )
    .sort(
      (a, b) =>
        new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime()
    );

  // Add or update watch progress
  const updateProgress = useCallback(
    async (movieId: number, watchPosition: number, duration: number) => {
      if (!user) return { success: false, error: 'Not logged in' };

      const result = await SupabaseService.addToHistory(user.id, movieId, watchPosition, duration);

      if (result.success) {
        fetchHistory();
      }

      return result;
    },
    [user, fetchHistory]
  );

  // Get progress for a specific movie
  const getProgress = useCallback(
    async (movieId: number) => {
      if (!user) return null;
      return await SupabaseService.getWatchProgress(user.id, movieId);
    },
    [user]
  );

  return {
    historyItems,
    continueWatching,
    loading,
    error,
    updateProgress,
    getProgress,
    refreshHistory: fetchHistory,
  };
}

/**
 * useMovieProgress Hook
 * Track and save progress for a single movie with auto-save
 */
export function useMovieProgress(movieId: number | null, episodeId?: number | null) {
  const { user } = useCurrentUser();
  const [progress, setProgress] = useState<{
    watchPosition: number;
    progress: number;
    duration: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSaveRef = useRef<number>(0);

  useEffect(() => {
    lastSaveRef.current = 0;
  }, [movieId, episodeId]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !movieId) {
        setProgress(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const savedProgress = await SupabaseService.getWatchProgress(user.id, movieId, episodeId ?? undefined);
      setProgress(savedProgress);
      setLoading(false);
    };

    loadProgress();
  }, [user, movieId, episodeId]);

  // Save progress (debounced - saves every 10 seconds minimum)
  const saveProgress = useCallback(
    async (watchPosition: number, duration: number) => {
      if (!user || !movieId) return;

      const now = Date.now();
      // Only save if 10 seconds have passed since last save
      if (now - lastSaveRef.current < 10000) return;

      lastSaveRef.current = now;
      const result = await SupabaseService.addToHistory(
        user.id,
        movieId,
        watchPosition,
        duration,
        episodeId ?? undefined
      );

      if (result.success) {
        setProgress({
          watchPosition,
          progress: duration > 0 ? Math.round((watchPosition / duration) * 100) : 0,
          duration,
        });
      }
    },
    [user, movieId, episodeId]
  );

  // Force save (for when video ends or user leaves)
  const forceSaveProgress = useCallback(
    async (watchPosition: number, duration: number) => {
      if (!user || !movieId) return;
      lastSaveRef.current = Date.now();
      const result = await SupabaseService.addToHistory(
        user.id,
        movieId,
        watchPosition,
        duration,
        episodeId ?? undefined
      );

      if (result.success) {
        setProgress({
          watchPosition,
          progress: duration > 0 ? Math.round((watchPosition / duration) * 100) : 0,
          duration,
        });
      }
    },
    [user, movieId, episodeId]
  );

  // Get initial position (as fraction 0-1 for video player)
  const initialPosition =
    progress && progress.duration > 0 ? progress.watchPosition / progress.duration : 0;

  return {
    progress,
    loading,
    initialPosition,
    saveProgress,
    forceSaveProgress,
  };
}
