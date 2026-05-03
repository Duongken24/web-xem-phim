import type {
  TMDBBackdropSize,
  TMDBCredits,
  TMDBDiscoverParams,
  TMDBGenre,
  TMDBImageSize,
  TMDBMovieDetail,
  TMDBMoviesResponse,
  TMDBSearchParams,
  TMDBVideosResponse,
} from '../types/tmdb.types';
import { USE_TMDB } from '../config/featureFlags';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = import.meta.env.VITE_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';
const DEFAULT_LANGUAGE = 'vi-VN';

const FALLBACK_IMAGES = {
  poster: '/fallback-poster.svg',
  backdrop: '/fallback-backdrop.svg',
  profile: '/fallback-profile.svg',
} as const;

type TMDBImageKind = keyof typeof FALLBACK_IMAGES;
type FetchParams = Record<string, string | number | boolean | null | undefined>;
type TMDBFetchParams = TMDBSearchParams | TMDBDiscoverParams | FetchParams;

async function tmdbFetch<T>(endpoint: string, params: TMDBFetchParams = {}): Promise<T> {
  if (!USE_TMDB) {
    throw new Error('TMDB is disabled by VITE_USE_TMDB=false');
  }

  if (!TMDB_API_KEY) {
    throw new Error('Missing VITE_TMDB_API_KEY in user/.env');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  const language = 'language' in params ? params.language : undefined;
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', String(language || DEFAULT_LANGUAGE));

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'language') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getTMDBFallbackImage(kind: TMDBImageKind = 'poster') {
  return FALLBACK_IMAGES[kind];
}

export function getTMDBImageUrl(
  path: string | null,
  size: TMDBImageSize | TMDBBackdropSize = 'original',
  kind: TMDBImageKind = 'poster'
) {
  if (!path) return getTMDBFallbackImage(kind);
  if (/^https?:\/\//i.test(path)) return path;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function getYouTubeUrl(key: string) {
  return `https://www.youtube.com/watch?v=${key}`;
}

export function getYouTubeEmbedUrl(key: string) {
  return `https://www.youtube.com/embed/${key}`;
}

export function searchMovies(params: TMDBSearchParams): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/search/movie', params);
}

export function getMovieDetails(movieId: number): Promise<TMDBMovieDetail> {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${movieId}`);
}

export function getMovieCredits(movieId: number): Promise<TMDBCredits> {
  return tmdbFetch<TMDBCredits>(`/movie/${movieId}/credits`);
}

export function getMovieVideos(movieId: number): Promise<TMDBVideosResponse> {
  return tmdbFetch<TMDBVideosResponse>(`/movie/${movieId}/videos`);
}

export function getMovieRecommendations(movieId: number, page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/movie/${movieId}/recommendations`, { page });
}

export function getSimilarMovies(movieId: number, page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/movie/${movieId}/similar`, { page });
}

export function discoverMovies(params: TMDBDiscoverParams = {}): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/discover/movie', params);
}

export function getPopularMovies(page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/popular', { page });
}

export function getTopRatedMovies(page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/top_rated', { page });
}

export function getNowPlayingMovies(page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/now_playing', { page });
}

export function getUpcomingMovies(page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>('/movie/upcoming', { page });
}

export function getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page = 1): Promise<TMDBMoviesResponse> {
  return tmdbFetch<TMDBMoviesResponse>(`/trending/movie/${timeWindow}`, { page });
}

export function getMovieGenres(): Promise<{ genres: TMDBGenre[] }> {
  return tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list');
}

export function getMoviesByGenre(genreId: number, page = 1): Promise<TMDBMoviesResponse> {
  return discoverMovies({
    with_genres: String(genreId),
    page,
    sort_by: 'popularity.desc',
  });
}

export function getMoviesByYear(year: number, page = 1): Promise<TMDBMoviesResponse> {
  return discoverMovies({
    primary_release_year: year,
    page,
    sort_by: 'popularity.desc',
  });
}

export function formatReleaseDate(dateString: string) {
  if (!dateString) return 'Chưa công bố';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRuntime(minutes: number) {
  if (!minutes) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;

  return `${hours} giờ ${mins} phút`;
}

export function getDirector(credits: TMDBCredits) {
  const director = credits.crew.find((member) => member.job === 'Director');
  return director ? director.name : 'N/A';
}

export function getMainCast(credits: TMDBCredits, limit = 10) {
  return credits.cast.slice(0, limit);
}

export function getTrailer(videos: TMDBVideosResponse) {
  const trailer = videos.results.find((video) => video.type === 'Trailer' && video.site === 'YouTube');
  return trailer ? getYouTubeEmbedUrl(trailer.key) : null;
}

export function formatRating(voteAverage: number) {
  return Math.round(voteAverage * 10) / 10;
}

export function getAgeRatingText(adult: boolean) {
  return adult ? '18+' : 'PG-13';
}

const TMDBService = {
  searchMovies,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getMovieRecommendations,
  getSimilarMovies,
  discoverMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getTrendingMovies,
  getMovieGenres,
  getMoviesByGenre,
  getMoviesByYear,
  getTMDBFallbackImage,
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
