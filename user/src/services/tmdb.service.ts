import type {
  TMDBMovieDetail,
  TMDBMoviesResponse,
  TMDBCredits,
  TMDBVideosResponse,
  TMDBSearchParams,
  TMDBDiscoverParams,
  TMDBGenre,
  TMDBImageSize,
  TMDBBackdropSize,
} from '../types/tmdb.types';

// TMDB Configuration
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

// Default language
const DEFAULT_LANGUAGE = 'vi-VN';

/**
 * Generic fetch function for TMDB API
 */
async function tmdbFetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  // Add API key and default params
  url.searchParams.append('api_key', TMDB_API_KEY);
  url.searchParams.append('language', params.language || DEFAULT_LANGUAGE);

  // Add other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'language') {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('TMDB API Error:', error);
    throw error;
  }
}

/**
 * Get full image URL from TMDB path
 */
export function getTMDBImageUrl(
  path: string | null,
  size: TMDBImageSize | TMDBBackdropSize = 'original'
): string {
  if (!path) return '/placeholder-movie.jpg'; // Fallback image
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Get YouTube video URL from TMDB video key
 */
export function getYouTubeUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${key}`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(key: string): string {
  return `https://www.youtube.com/embed/${key}`;
}

// ============================================
// MOVIE ENDPOINTS
// ============================================

/**
 * Search movies by keyword
 */
export async function searchMovies(params: TMDBSearchParams): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/search/movie', params);
}

/**
 * Get movie details by TMDB ID
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovieDetail> {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${movieId}`);
}

/**
 * Get movie credits (cast & crew)
 */
export async function getMovieCredits(movieId: number): Promise<TMDBCredits> {
  return tmdbFetch<TMDBCredits>(`/movie/${movieId}/credits`);
}

/**
 * Get movie videos (trailers, teasers)
 */
export async function getMovieVideos(movieId: number): Promise<TMDBVideosResponse> {
  return tmdbFetch<TMDBVideosResponse>(`/movie/${movieId}/videos`);
}

/**
 * Get movie recommendations
 */
export async function getMovieRecommendations(movieId: number, page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/movie/${movieId}/recommendations`, { page });
}

/**
 * Get similar movies
 */
export async function getSimilarMovies(movieId: number, page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/movie/${movieId}/similar`, { page });
}

// ============================================
// DISCOVER & BROWSE ENDPOINTS
// ============================================

/**
 * Discover movies with filters
 */
export async function discoverMovies(params: TMDBDiscoverParams = {}): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/discover/movie', params);
}

/**
 * Get popular movies
 */
export async function getPopularMovies(page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/popular', { page });
}

/**
 * Get top rated movies
 */
export async function getTopRatedMovies(page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/top_rated', { page });
}

/**
 * Get now playing movies
 */
export async function getNowPlayingMovies(page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/now_playing', { page });
}

/**
 * Get upcoming movies
 */
export async function getUpcomingMovies(page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/upcoming', { page });
}

/**
 * Get trending movies (day/week)
 */
export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/trending/movie/${timeWindow}`, { page });
}

// ============================================
// GENRE ENDPOINTS
// ============================================

/**
 * Get all movie genres
 */
export async function getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
  return tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list');
}

/**
 * Get movies by genre
 */
export async function getMoviesByGenre(genreId: number, page: number = 1): Promise<TMDBMoviesResponse> {
  return discoverMovies({
    with_genres: String(genreId),
    page,
    sort_by: 'popularity.desc',
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format release date to Vietnamese format
 */
export function formatReleaseDate(dateString: string): string {
  if (!dateString) return 'Chưa công bố';

  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format runtime to hours and minutes
 */
export function formatRuntime(minutes: number): string {
  if (!minutes) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;

  return `${hours} giờ ${mins} phút`;
}

/**
 * Get director from crew
 */
export function getDirector(credits: TMDBCredits): string {
  const director = credits.crew.find(member => member.job === 'Director');
  return director ? director.name : 'N/A';
}

/**
 * Get main cast (first 10)
 */
export function getMainCast(credits: TMDBCredits, limit: number = 10): TMDBCredits['cast'] {
  return credits.cast.slice(0, limit);
}

/**
 * Get trailer from videos
 */
export function getTrailer(videos: TMDBVideosResponse): string | null {
  const trailer = videos.results.find(
    video => video.type === 'Trailer' && video.site === 'YouTube'
  );

  return trailer ? getYouTubeEmbedUrl(trailer.key) : null;
}

/**
 * Convert TMDB rating to 10-point scale
 */
export function formatRating(voteAverage: number): number {
  return Math.round(voteAverage * 10) / 10;
}

/**
 * Get age rating text
 */
export function getAgeRatingText(adult: boolean): string {
  return adult ? '18+' : 'PG-13';
}

// ============================================
// EXPORT ALL
// ============================================

const TMDBService = {
  // Search & Details
  searchMovies,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getMovieRecommendations,
  getSimilarMovies,

  // Discover & Browse
  discoverMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingMovies,

  // Genres
  getMovieGenres,
  getMoviesByGenre,

  // Utilities
  getTMDBImageUrl,
  getYouTubeUrl,
  getYouTubeEmbedUrl,
  formatReleaseDate,
  formatRuntime,
  getDirector,
  getMainCast,
  getTrailer,
  formatRating,
  getAgeRatingText,
};

export default TMDBService;
