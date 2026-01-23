import { useState, useEffect } from 'react';
import TMDBService from '../services/tmdb.service';
import type {
  TMDBMovieDetail,
  TMDBCredits,
  TMDBVideosResponse,
  TMDBMoviesResponse,
  TMDBGenre,
} from '../types/tmdb.types';

// ============================================
// HOOK: useMovieSearch
// ============================================
export function useMovieSearch(query: string, enabled: boolean = true) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query || !enabled) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.searchMovies({ query, page: 1 });
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 500); // Debounce 500ms
    return () => clearTimeout(debounce);
  }, [query, enabled]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useMovieDetails
// ============================================
export function useMovieDetails(movieId: number | null) {
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [credits, setCredits] = useState<TMDBCredits | null>(null);
  const [videos, setVideos] = useState<TMDBVideosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!movieId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [movieData, creditsData, videosData] = await Promise.all([
          TMDBService.getMovieDetails(movieId),
          TMDBService.getMovieCredits(movieId),
          TMDBService.getMovieVideos(movieId),
        ]);

        setMovie(movieData);
        setCredits(creditsData);
        setVideos(videosData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [movieId]);

  return { movie, credits, videos, loading, error };
}

// ============================================
// HOOK: usePopularMovies
// ============================================
export function usePopularMovies(page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getPopularMovies(page);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useTrendingMovies
// ============================================
export function useTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getTrendingMovies(timeWindow, page);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeWindow, page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useTopRatedMovies
// ============================================
export function useTopRatedMovies(page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getTopRatedMovies(page);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useMovieGenres
// ============================================
export function useMovieGenres() {
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getMovieGenres();
        setGenres(result.genres);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { genres, loading, error };
}

// ============================================
// HOOK: useMoviesByGenre
// ============================================
export function useMoviesByGenre(genreId: number | null, page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!genreId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getMoviesByGenre(genreId, page);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [genreId, page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useNowPlayingMovies
// ============================================
export function useNowPlayingMovies(page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.getNowPlayingMovies(page);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// HOOK: useDiscoverMovies (with filters)
// ============================================
export function useDiscoverMovies(filters: Record<string, any> = {}, page: number = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await TMDBService.discoverMovies({ ...filters, page });
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(filters), page]);

  return { data, loading, error, movies: data?.results || [] };
}

// ============================================
// EXPORT ALL HOOKS
// ============================================
const useTMDB = {
  useMovieSearch,
  useMovieDetails,
  usePopularMovies,
  useTrendingMovies,
  useTopRatedMovies,
  useMovieGenres,
  useMoviesByGenre,
  useNowPlayingMovies,
  useDiscoverMovies,
};

export default useTMDB;
