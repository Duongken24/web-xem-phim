import { supabase } from '../lib/supabase';

/**
 * Supabase Service - User Data Operations
 * Architecture: Only store movie_id, fetch metadata from the internal catalog service at runtime
 */

// ============================================
// WATCHLIST OPERATIONS
// ============================================

export interface WatchlistItem {
  id: number;
  user_id: string;
  movie_id: number; // Legacy metadata movie ID
  created_at: string;
}

/**
 * Add movie to user's watchlist
 */
export async function addToWatchlist(userId: string, movieId: number): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if already exists to avoid duplicate errors
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .maybeSingle();

    if (existing) {
      return { success: true }; // Already in watchlist
    }

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        movie_id: movieId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's watchlist (returns only movie_ids)
 */
export async function getWatchlist(userId: string): Promise<{ movieIds: number[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('movie_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { movieIds: [], error: error.message };
    }

    const movieIds = data?.map(item => item.movie_id) || [];
    return { movieIds };
  } catch (error: any) {
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
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return false;
    }

    return !!data;
  } catch {
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

    // Find the latest existing record for this user/movie/episode combination.
    // We intentionally avoid `.single()` here because duplicate rows may already exist.
    let existingQuery = supabase
      .from('watch_history')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .order('last_watched_at', { ascending: false })
      .limit(1);

    existingQuery = episodeId ? existingQuery.eq('episode_id', episodeId) : existingQuery.is('episode_id', null);

    const { data: existingRows, error: existingError } = await existingQuery;

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    const existing = existingRows?.[0];

    if (existing) {
      // Update the latest record instead of creating a new one
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
    return { success: false, error: error.message };
  }
}

/**
 * Get user's watch history (returns movie_ids with progress)
 */
export async function getWatchHistory(userId: string, limit: number = 20): Promise<{
  items: Array<{
    movie_id: number;
    episode_id?: number | null;
    progress: number;
    watch_position: number;
    duration: number;
    last_watched_at: string;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('watch_history')
      .select('movie_id, episode_id, progress, watch_position, duration, last_watched_at')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false })
      .limit(Math.max(limit * 5, limit));

    if (error) {
      return { items: [], error: error.message };
    }

    // Keep only the latest record for each movie_id so HistoryPage and Continue Watching
    // never render duplicate rows for the same movie.
    const uniqueItems = new Map<number, (typeof data)[number]>();

    for (const item of data || []) {
      if (!uniqueItems.has(item.movie_id)) {
        uniqueItems.set(item.movie_id, item);
      }
    }

    return { items: Array.from(uniqueItems.values()).slice(0, limit) };
  } catch (error: any) {
    return { items: [], error: error.message };
  }
}

/**
 * Get watch progress for a specific movie
 */
export async function getWatchProgress(userId: string, movieId: number, episodeId?: number): Promise<{
  watchPosition: number;
  progress: number;
  duration: number;
} | null> {
  try {
    let query = supabase
      .from('watch_history')
      .select('watch_position, progress, duration')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .order('last_watched_at', { ascending: false })
      .limit(1);

    query = episodeId ? query.eq('episode_id', episodeId) : query.is('episode_id', null);

    const { data, error } = await query;

    if (error) {
      return null;
    }

    const latest = data?.[0];

    return latest ? {
      watchPosition: latest.watch_position,
      progress: latest.progress,
      duration: latest.duration,
    } : null;
  } catch {
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
    // Find the latest existing rating instead of using `.single()` so old duplicate data
    // cannot force a new duplicate row.
    const { data: existingRows, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('movie_id', movieId)
      .order('id', { ascending: false })
      .limit(1);

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    const existing = existingRows?.[0];

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
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      return null;
    }

    return data?.[0] || null;
  } catch {
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
      return { ratings: [], error: error.message };
    }

    return { ratings: data || [] };
  } catch (error: any) {
    return { ratings: [], error: error.message };
  }
}

// ============================================
// COMMENT OPERATIONS
// ============================================

export interface Comment {
  id: number;
  user_id: string;
  movie_id: number;
  author_name: string | null;
  content: string;
  created_at: string;
}

/**
 * Get all comments for a movie
 */
export async function getMovieComments(movieId: number): Promise<{ comments: Comment[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) {
      return { comments: [], error: error.message };
    }

    const comments =
      data?.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        movie_id: item.movie_id,
        author_name: item.author_name ?? null,
        content: item.content,
        created_at: item.created_at,
      })) || [];

    return { comments };
  } catch (error: any) {
    return { comments: [], error: error.message };
  }
}

/**
 * Add a comment for a movie
 */
export async function addComment(
  userId: string,
  movieId: number,
  content: string,
  authorName?: string
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  try {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      return { success: false, error: 'Nội dung bình luận không được để trống.' };
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        movie_id: movieId,
        author_name: authorName?.trim() || null,
        content: normalizedContent,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      comment: data
        ? {
            id: data.id,
            user_id: data.user_id,
            movie_id: data.movie_id,
            author_name: data.author_name ?? null,
            content: data.content,
            created_at: data.created_at,
          }
        : undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
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

  // Comments
  getMovieComments,
  addComment,
};

export default SupabaseService;
