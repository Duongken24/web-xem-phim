import { useEffect, useMemo, useState } from 'react';
import TMDBService from '../services/tmdb.service';
import type {
  TMDBCredits,
  TMDBGenre,
  TMDBMovieDetail,
  TMDBMoviesResponse,
  TMDBVideosResponse,
} from '../types/tmdb.types';

type DiscoverFilters = Record<string, string | number | boolean | null | undefined>;

export function useMovieSearch(query: string, enabled = true, page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    if (!query || !enabled) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.searchMovies({ query, page }));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = window.setTimeout(fetchData, 500);
    return () => window.clearTimeout(debounce);
  }, [query, enabled, page]);

  return { data, loading, error, movies };
}

export function useMovieDetails(movieId: number | null) {
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [credits, setCredits] = useState<TMDBCredits | null>(null);
  const [videos, setVideos] = useState<TMDBVideosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!movieId) {
      setMovie(null);
      setCredits(null);
      setVideos(null);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [movieData, creditsData, videosData] = await Promise.all([
          TMDBService.getMovieDetails(movieId),
          TMDBService.getMovieCredits(movieId),
          TMDBService.getMovieVideos(movieId),
        ]);

        if (!isMounted) return;

        setMovie(movieData);
        setCredits(creditsData);
        setVideos(videosData);
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [movieId]);

  return { movie, credits, videos, loading, error };
}

export function usePopularMovies(page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getPopularMovies(page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies };
}

export function useTrendingMovies(timeWindow: 'day' | 'week' = 'week', page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getTrendingMovies(timeWindow, page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeWindow, page]);

  return { data, loading, error, movies };
}

export function useTopRatedMovies(page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getTopRatedMovies(page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies };
}

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

export function useMoviesByGenre(genreId: number | null, page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    if (!genreId) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getMoviesByGenre(genreId, page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [genreId, page]);

  return { data, loading, error, movies };
}

export function useMoviesByYear(year: number | null, page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    if (!year) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getMoviesByYear(year, page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, page]);

  return { data, loading, error, movies };
}

export function useNowPlayingMovies(page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.getNowPlayingMovies(page));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  return { data, loading, error, movies };
}

export function useDiscoverMovies(filters: DiscoverFilters = {}, page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results || [];
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await TMDBService.discoverMovies({ ...filters, page }));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filtersKey, page]);

  return { data, loading, error, movies };
}

const useTMDB = {
  useMovieSearch,
  useMovieDetails,
  usePopularMovies,
  useTrendingMovies,
  useTopRatedMovies,
  useMovieGenres,
  useMoviesByGenre,
  useMoviesByYear,
  useNowPlayingMovies,
  useDiscoverMovies,
};

export default useTMDB;
