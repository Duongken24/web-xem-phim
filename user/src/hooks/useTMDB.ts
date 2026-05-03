import { useEffect, useMemo, useState } from 'react';
import { USE_TMDB } from '../config/featureFlags';
import CatalogService from '../services/catalog.service';
import { getCatalogGenres } from '../services/catalog-meta.service';
import TMDBService from '../services/tmdb.service';
import { GENRE_NAMES_VI } from '../utils/constants';
import type {
  TMDBCredits,
  TMDBGenre,
  TMDBMovieDetail,
  TMDBMoviesResponse,
  TMDBVideosResponse,
} from '../types/tmdb.types';

type DiscoverFilters = Record<string, string | number | boolean | null | undefined>;

const EMPTY_MOVIES: TMDBMoviesResponse['results'] = [];
const LOCAL_GENRES: TMDBGenre[] = Object.entries(GENRE_NAMES_VI).map(([id, name]) => ({
  id: Number(id),
  name,
}));

function catalogMovieToTmdbMovie(movie: any) {
  return {
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title || movie.title,
    overview: movie.overview || '',
    poster_path: movie.poster_url || movie.poster_path,
    backdrop_path: movie.backdrop_url || movie.backdrop_path,
    release_date: movie.release_date || (movie.release_year ? `${movie.release_year}-01-01` : ''),
    genre_ids: [],
    adult: false,
    original_language: movie.original_language || 'vi',
    popularity: 0,
    vote_average: movie.vote_average || movie.average_rating || 0,
    vote_count: movie.vote_count || 0,
    video: false,
  };
}

export function useMovieSearch(query: string, enabled = true, page = 1) {
  const [data, setData] = useState<TMDBMoviesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!query || !enabled) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!USE_TMDB) {
          const { data: catalogData, error: catalogError } = await CatalogService.searchCatalogMovies(query, page);
          if (catalogError) throw new Error(catalogError);
          setData(catalogData);
          return;
        }

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
    if (!movieId || !USE_TMDB) {
      setMovie(null);
      setCredits(null);
      setVideos(null);
      setLoading(false);
      setError(null);
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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!USE_TMDB) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!USE_TMDB) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!USE_TMDB) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

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
    if (!USE_TMDB) {
      const fetchCatalogGenres = async () => {
        try {
          setLoading(true);
          setError(null);
          const catalogGenres = await getCatalogGenres();
          setGenres(catalogGenres.length > 0 ? catalogGenres.map((genre) => ({ id: genre.id, name: genre.name })) : LOCAL_GENRES);
        } catch (err) {
          setGenres(LOCAL_GENRES);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };

      fetchCatalogGenres();
      return;
    }

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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!genreId) {
      setData(null);
      return;
    }

    if (!USE_TMDB) {
      const fetchCatalogData = async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await CatalogService.getCatalogMoviesByGenre(genreId, page);
          if (result.error) throw new Error(result.error);
          setData({
            page,
            results: result.movies.map(catalogMovieToTmdbMovie),
            total_pages: result.totalPages,
            total_results: result.totalResults,
          });
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };

      fetchCatalogData();
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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!year) {
      setData(null);
      return;
    }

    if (!USE_TMDB) {
      const fetchCatalogData = async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await CatalogService.getCatalogMoviesByYear(year, page);
          if (result.error) throw new Error(result.error);
          setData({
            page,
            results: result.movies.map(catalogMovieToTmdbMovie),
            total_pages: result.totalPages,
            total_results: result.totalResults,
          });
        } catch (err) {
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };

      fetchCatalogData();
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
  const movies = data?.results ?? EMPTY_MOVIES;

  useEffect(() => {
    if (!USE_TMDB) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

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
  const movies = data?.results ?? EMPTY_MOVIES;
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!USE_TMDB) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

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
