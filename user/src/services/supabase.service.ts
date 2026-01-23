import { supabase } from '../lib/supabase';

/**
 * Supabase Service - User Data Operations
 * Architecture: Only store movie_id (TMDB ID), fetch metadata from TMDB real-time
 */

// ============================================
// WATCHLIST OPERATIONS
// ============================================

export interface WatchlistItem {
  id: number;
  user_id: string;
  movie_id: number; // TMDB movie ID
  created_at: string;
}

/**
 * Add movie to user's watchlist
 */
export async function addToWatchlist(userId: string, movieId: number): Promise<{ success: boolean; error?: string }> {
  console.log('SupabaseService.addToWatchlist - Starting:', { userId, movieId });

  try {
    // First check if already exists to avoid duplicate errors
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single();

    if (existing) {
      console.log('SupabaseService.addToWatchlist - Already exists:', existing);
      return { success: true }; // Already in watchlist
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        movie_id: movieId,
      })
      .select()
      .single();

    if (error) {
      console.error('SupabaseService.addToWatchlist - Insert error:', error);
      return { success: false, error: error.message };
    }

    console.log('SupabaseService.addToWatchlist - Success:', data);
    return { success: true };
  } catch (error: any) {
    console.error('SupabaseService.addToWatchlist - Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove movie from user's watchlist
 */
export async function removeFromWatchlist(userId: string, movieId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);

    if (error) {
      console.error('Error removing from watchlist:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing from watchlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's watchlist (returns only movie_ids)
 */
export async function getWatchlist(userId: string): Promise<{ movieIds: number[]; error?: string }> {
  console.log('SupabaseService.getWatchlist - Starting for user:', userId);

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('movie_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('SupabaseService.getWatchlist - Raw response:', { data, error });

    if (error) {
      console.error('SupabaseService.getWatchlist - Error:', error);
      return { movieIds: [], error: error.message };
    }

    const movieIds = data?.map(item => item.movie_id) || [];
    console.log('SupabaseService.getWatchlist - Parsed movieIds:', movieIds);
    return { movieIds };
  } catch (error: any) {
    console.error('SupabaseService.getWatchlist - Exception:', error);
    return { movieIds: [], error: error.message };
  }
}

/**
 * Check if movie is in user's watchlist
 */
export async function isInWatchlist(userId: string, movieId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking watchlist:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking watchlist:', error);
    return false;
  }
}

// ============================================
// WATCH HISTORY OPERATIONS
// ============================================

export interface WatchHistoryItem {
  id: number;
  user_id: string;
  movie_id: number;
  episode_id?: number;
  watch_position: number; // in seconds
  duration: number; // total duration in seconds
  progress: number; // percentage (0-100)
  last_watched_at: string;
}

/**
 * Add or update watch history
 */
export async function addToHistory(
  userId: string,
  movieId: number,
  watchPosition: number,
  duration: number,
  episodeId?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const progress = duration > 0 ? Math.round((watchPosition / duration) * 100) : 0;

    // Check if history exists
    const { data: existing } = await supabase
      .from('watch_history')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .eq('episode_id', episodeId || null)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('watch_history')
        .update({
          watch_position: watchPosition,
          duration,
          progress,
          last_watched_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('watch_history')
        .insert({
          user_id: userId,
          movie_id: movieId,
          episode_id: episodeId,
          watch_position: watchPosition,
          duration,
          progress,
          last_watched_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error adding to history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's watch history (returns movie_ids with progress)
 */
export async function getWatchHistory(userId: string, limit: number = 20): Promise<{
  items: Array<{ movie_id: number; progress: number; last_watched_at: string }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('watch_history')
      .select('movie_id, progress, last_watched_at')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching watch history:', error);
      return { items: [], error: error.message };
    }

    return { items: data || [] };
  } catch (error: any) {
    console.error('Error fetching watch history:', error);
    return { items: [], error: error.message };
  }
}

/**
 * Get watch progress for a specific movie
 */
export async function getWatchProgress(userId: string, movieId: number): Promise<{
  watchPosition: number;
  progress: number;
  duration: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('watch_history')
      .select('watch_position, progress, duration')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching watch progress:', error);
      return null;
    }

    return data ? {
      watchPosition: data.watch_position,
      progress: data.progress,
      duration: data.duration,
    } : null;
  } catch (error) {
    console.error('Error fetching watch progress:', error);
    return null;
  }
}

// ============================================
// RATING OPERATIONS
// ============================================

export interface Rating {
  id: number;
  user_id: string;
  movie_id: number;
  rating: number; // 1-10
  review?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Add or update movie rating
 */
export async function addRating(
  userId: string,
  movieId: number,
  rating: number,
  review?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if rating exists
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('ratings')
        .update({
          rating,
          review,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('ratings')
        .insert({
          user_id: userId,
          movie_id: movieId,
          rating,
          review,
        });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error adding rating:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's rating for a movie
 */
export async function getUserRating(userId: string, movieId: number): Promise<Rating | null> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching rating:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching rating:', error);
    return null;
  }
}

/**
 * Get all ratings for a movie
 */
export async function getMovieRatings(movieId: number): Promise<{ ratings: Rating[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching movie ratings:', error);
      return { ratings: [], error: error.message };
    }

    return { ratings: data || [] };
  } catch (error: any) {
    console.error('Error fetching movie ratings:', error);
    return { ratings: [], error: error.message };
  }
}

// ============================================
// EXPORT ALL
// ============================================

const SupabaseService = {
  // Watchlist
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  isInWatchlist,

  // Watch History
  addToHistory,
  getWatchHistory,
  getWatchProgress,

  // Ratings
  addRating,
  getUserRating,
  getMovieRatings,
};

export default SupabaseService;
