import { useState, useEffect, useCallback, useRef } from 'react';
import * as SupabaseService from '../services/supabase.service';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovie } from '../types/tmdb.types';
import { useCurrentUser } from './useAuth';

export interface WatchHistoryMovie extends TMDBMovie {
  progress: number;
  lastWatchedAt: string;
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
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { items, error: fetchError } = await SupabaseService.getWatchHistory(user.id, 20);

      if (fetchError) {
        setError(fetchError);
        setLoading(false);
        return;
      }

      // Fetch movie details from TMDB
      if (items.length > 0) {
        const moviePromises = items.map(async (item) => {
          try {
            const movie = await TMDBService.getMovieDetails(item.movie_id);
            return {
              ...movie,
              progress: item.progress,
              lastWatchedAt: item.last_watched_at,
            } as WatchHistoryMovie;
          } catch {
            return null;
          }
        });

        const movies = await Promise.all(moviePromises);
        setHistoryItems(movies.filter((m): m is WatchHistoryMovie => m !== null));
      } else {
        setHistoryItems([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load history on mount and user change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Get movies that are in progress (< 90% watched)
  const continueWatching = historyItems.filter((m) => m.progress > 0 && m.progress < 90);

  // Add or update watch progress
  const updateProgress = useCallback(
    async (movieId: number, watchPosition: number, duration: number) => {
      if (!user) return { success: false, error: 'Not logged in' };

      const result = await SupabaseService.addToHistory(user.id, movieId, watchPosition, duration);

      if (result.success) {
        // Refresh history
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
export function useMovieProgress(movieId: number) {
  const { user } = useCurrentUser();
  const [progress, setProgress] = useState<{
    watchPosition: number;
    progress: number;
    duration: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSaveRef = useRef<number>(0);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !movieId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const savedProgress = await SupabaseService.getWatchProgress(user.id, movieId);
      setProgress(savedProgress);
      setLoading(false);
    };

    loadProgress();
  }, [user, movieId]);

  // Save progress (debounced - saves every 10 seconds minimum)
  const saveProgress = useCallback(
    async (watchPosition: number, duration: number) => {
      if (!user || !movieId) return;

      const now = Date.now();
      // Only save if 10 seconds have passed since last save
      if (now - lastSaveRef.current < 10000) return;

      lastSaveRef.current = now;
      await SupabaseService.addToHistory(user.id, movieId, watchPosition, duration);
    },
    [user, movieId]
  );

  // Force save (for when video ends or user leaves)
  const forceSaveProgress = useCallback(
    async (watchPosition: number, duration: number) => {
      if (!user || !movieId) return;
      lastSaveRef.current = Date.now();
      await SupabaseService.addToHistory(user.id, movieId, watchPosition, duration);
    },
    [user, movieId]
  );

  // Get initial position (as fraction 0-1 for video player)
  const initialPosition = progress ? progress.watchPosition / progress.duration : 0;

  return {
    progress,
    loading,
    initialPosition,
    saveProgress,
    forceSaveProgress,
  };
}
