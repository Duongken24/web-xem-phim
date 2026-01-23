import { useState, useEffect } from 'react';
import * as SupabaseService from '../services/supabase.service';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovie } from '../types/tmdb.types';
import { useCurrentUser } from './useAuth';

/**
 * useWatchlist Hook
 * Manages user's watchlist (movie_ids in Supabase + metadata from TMDB)
 */
export function useWatchlist() {
  const { user } = useCurrentUser();
  const [movieIds, setMovieIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch watchlist movie IDs
  useEffect(() => {
    if (!user) {
      setMovieIds([]);
      setMovies([]);
      setLoading(false);
      return;
    }

    const fetchWatchlist = async () => {
      setLoading(true);
      setError(null);

      console.log('useWatchlist - Fetching watchlist for user:', user.id);

      const { movieIds: ids, error: err } = await SupabaseService.getWatchlist(user.id);

      console.log('useWatchlist - Got movie IDs:', ids);
      console.log('useWatchlist - Error:', err);

      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      setMovieIds(ids);

      // Fetch movie details from TMDB
      if (ids.length > 0) {
        try {
          console.log('useWatchlist - Fetching TMDB details for', ids.length, 'movies');
          const moviePromises = ids.map(id => TMDBService.getMovieDetails(id));
          const movieDetails = await Promise.allSettled(moviePromises);

          const fetchedMovies = movieDetails
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(movie => movie !== null && movie !== undefined);

          console.log('useWatchlist - Fetched movies:', fetchedMovies);
          setMovies(fetchedMovies);
        } catch (err: any) {
          console.error('useWatchlist - TMDB error:', err);
          setError(err.message);
        }
      } else {
        setMovies([]);
      }

      setLoading(false);
    };

    fetchWatchlist();
  }, [user]);

  /**
   * Add movie to watchlist
   */
  const addToWatchlist = async (movieId: number) => {
    console.log('useWatchlist.addToWatchlist - Starting:', { movieId, user: user?.id });

    if (!user) {
      console.error('useWatchlist.addToWatchlist - No user logged in');
      return { success: false, error: 'Please login to add to watchlist' };
    }

    const result = await SupabaseService.addToWatchlist(user.id, movieId);
    console.log('useWatchlist.addToWatchlist - Supabase result:', result);

    if (result.success) {
      // Update local state immediately for UI responsiveness
      setMovieIds(prev => {
        if (prev.includes(movieId)) return prev;
        return [movieId, ...prev];
      });

      // Fetch movie details from TMDB
      try {
        const movieDetail = await TMDBService.getMovieDetails(movieId);
        console.log('useWatchlist.addToWatchlist - TMDB movie fetched:', movieDetail?.title);
        setMovies(prev => {
          if (prev.some(m => m.id === movieId)) return prev;
          return [movieDetail, ...prev];
        });
      } catch (err) {
        console.error('useWatchlist.addToWatchlist - Error fetching movie details:', err);
      }
    } else {
      console.error('useWatchlist.addToWatchlist - Failed:', result.error);
    }

    return result;
  };

  /**
   * Remove movie from watchlist
   */
  const removeFromWatchlist = async (movieId: number) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await SupabaseService.removeFromWatchlist(user.id, movieId);

    if (result.success) {
      setMovieIds(prev => prev.filter(id => id !== movieId));
      setMovies(prev => prev.filter(movie => movie.id !== movieId));
    }

    return result;
  };

  /**
   * Check if movie is in watchlist
   */
  const isInWatchlist = (movieId: number) => {
    return movieIds.includes(movieId);
  };

  /**
   * Toggle watchlist
   */
  const toggleWatchlist = async (movieId: number) => {
    if (isInWatchlist(movieId)) {
      return await removeFromWatchlist(movieId);
    } else {
      return await addToWatchlist(movieId);
    }
  };

  return {
    movieIds,
    movies,
    loading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
  };
}

/**
 * useIsInWatchlist Hook
 * Check if a specific movie is in watchlist (lighter version)
 */
export function useIsInWatchlist(movieId: number) {
  const { user } = useCurrentUser();
  const [isInList, setIsInList] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !movieId) {
      setIsInList(false);
      setLoading(false);
      return;
    }

    const checkWatchlist = async () => {
      const result = await SupabaseService.isInWatchlist(user.id, movieId);
      setIsInList(result);
      setLoading(false);
    };

    checkWatchlist();
  }, [user, movieId]);

  return { isInList, loading };
}
