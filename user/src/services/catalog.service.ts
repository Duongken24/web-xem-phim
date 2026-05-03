import { supabase } from '../lib/supabase';
import type { TMDBMovie, TMDBMovieDetail, TMDBMoviesResponse } from '../types/tmdb.types';
import { getApiBaseUrl } from './api';

export interface CatalogMovie {
  id: number;
  tmdb_id: number | null;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  vote_average: number | null;
  vote_count: number | null;
  type?: string | null;
  video_url: string | null;
  stream_url: string | null;
  status: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  is_trending?: boolean | null;
  is_premium: boolean | null;
  has_play_source: boolean;
}

export interface MovieRanking {
  movie_id: number;
  tmdb_id: number | null;
  title: string;
  poster_path: string | null;
  poster_url: string | null;
  view_count: number;
  favorite_count: number;
  rating_count: number;
  average_rating: number;
  comment_count: number;
  ranking_score: number;
}

export interface SimilarMovie {
  id: number;
  tmdb_id: number | null;
  title: string;
  original_title: string | null;
  slug: string | null;
  poster_url: string | null;
  poster_path: string | null;
  source_type: string | null;
  has_play_source: boolean;
  similarity_score: number;
  reason_tags: string[];
}

export type MovieRankingPeriod = 'all' | 'week' | 'month';

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asSafeNumber(value: unknown, fallback = 0): number {
  const parsed = asNumber(value);
  return parsed ?? fallback;
}

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) return null;
  const year = new Date(releaseDate).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function mapMovieRanking(row: any): MovieRanking {
  return {
    movie_id: Number(row.movie_id),
    tmdb_id: row.tmdb_id === null || row.tmdb_id === undefined ? null : Number(row.tmdb_id),
    title: row.title || `Movie #${row.movie_id}`,
    poster_path: row.poster_path ?? null,
    poster_url: row.poster_url ?? null,
    view_count: asSafeNumber(row.view_count),
    favorite_count: asSafeNumber(row.favorite_count),
    rating_count: asSafeNumber(row.rating_count),
    average_rating: asSafeNumber(row.average_rating),
    comment_count: asSafeNumber(row.comment_count),
    ranking_score: asSafeNumber(row.ranking_score),
  };
}

function mapMovie(row: any): CatalogMovie {
  return {
    id: Number(row.id),
    tmdb_id: row.tmdb_id === null || row.tmdb_id === undefined ? null : Number(row.tmdb_id),
    title: row.title,
    original_title: row.original_title ?? null,
    overview: row.overview ?? null,
    poster_path: row.poster_path ?? null,
    backdrop_path: row.backdrop_path ?? null,
    poster_url: row.poster_url ?? null,
    backdrop_url: row.backdrop_url ?? null,
    release_date: row.release_date ?? null,
    release_year: row.release_year ?? null,
    runtime_minutes: row.runtime_minutes ?? null,
    vote_average: row.vote_average === null || row.vote_average === undefined ? null : Number(row.vote_average),
    vote_count: row.vote_count ?? null,
    type: row.type ?? null,
    video_url: row.video_url ?? null,
    stream_url: row.stream_url ?? null,
    status: row.status ?? null,
    is_active: row.is_active ?? null,
    is_featured: row.is_featured ?? null,
    is_trending: row.is_trending ?? null,
    is_premium: row.is_premium ?? null,
    has_play_source:
      row.has_play_source ??
      Boolean(row.video_url || row.stream_url),
  };
}

function mergeCatalogMovieRows(primaryRow: any, fallbackRow: any) {
  if (primaryRow && fallbackRow) {
    return {
      ...fallbackRow,
      ...primaryRow,
      has_play_source:
        primaryRow.has_play_source ??
        fallbackRow.has_play_source ??
        Boolean(
          primaryRow.video_url ||
            primaryRow.stream_url ||
            fallbackRow.video_url ||
            fallbackRow.stream_url
        ),
    };
  }

  return primaryRow || fallbackRow || null;
}

function mapSimilarMovie(row: any): SimilarMovie {
  return {
    id: Number(row.id),
    tmdb_id: row.tmdb_id === null || row.tmdb_id === undefined ? null : Number(row.tmdb_id),
    title: row.title || `Movie #${row.id}`,
    original_title: row.original_title ?? null,
    slug: row.slug ?? null,
    poster_url: row.poster_url ?? null,
    poster_path: row.poster_path ?? null,
    source_type: row.source_type ?? null,
    has_play_source: Boolean(row.has_play_source),
    similarity_score: asSafeNumber(row.similarity_score),
    reason_tags: Array.isArray(row.reason_tags) ? row.reason_tags.filter(Boolean).map(String) : [],
  };
}

function tmdbPayload(movie: TMDBMovieDetail, includeDefaults = false) {
  const basePayload = {
    tmdb_id: movie.id,
    title: movie.title || movie.original_title || `TMDB ${movie.id}`,
    original_title: movie.original_title ?? null,
    overview: movie.overview ?? null,
    poster_path: movie.poster_path ?? null,
    backdrop_path: movie.backdrop_path ?? null,
    release_date: movie.release_date || null,
    release_year: getReleaseYear(movie.release_date),
    runtime_minutes: movie.runtime ?? null,
    vote_average: movie.vote_average ?? null,
    vote_count: movie.vote_count ?? null,
    original_language: movie.original_language ?? null,
    tmdb_synced_at: new Date().toISOString(),
  };

  if (!includeDefaults) return basePayload;

  return {
    ...basePayload,
    source_type: 'tmdb',
    status: 'active',
    is_active: true,
  };
}


function normalizeCatalogSearchText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function scoreCatalogMovieForSearch(movie: CatalogMovie, normalizedQuery: string, queryTokens: string[]) {
  const title = normalizeCatalogSearchText(movie.title);
  const originalTitle = normalizeCatalogSearchText(movie.original_title);
  const overview = normalizeCatalogSearchText(movie.overview);

  let score = 0;

  if (title === normalizedQuery || originalTitle === normalizedQuery) score += 120;
  if (title.startsWith(normalizedQuery) || originalTitle.startsWith(normalizedQuery)) score += 80;
  if (title.includes(normalizedQuery) || originalTitle.includes(normalizedQuery)) score += 50;
  if (overview.includes(normalizedQuery)) score += 18;

  const tokenMatches = queryTokens.filter(
    (token) =>
      title.includes(token) ||
      originalTitle.includes(token) ||
      overview.includes(token)
  ).length;

  score += tokenMatches * 9;

  if (movie.vote_average && movie.vote_average >= 7) score += 4;
  if (movie.has_play_source) score += 3;

  return score;
}

function mapCatalogMovieToTmdbMovie(movie: CatalogMovie): TMDBMovie {
  return {
    id: movie.tmdb_id || movie.id,
    title: movie.title,
    original_title: movie.original_title || movie.title,
    overview: movie.overview || '',
    poster_path: movie.poster_url || movie.poster_path,
    backdrop_path: movie.backdrop_url || movie.backdrop_path,
    release_date: movie.release_date || (movie.release_year ? `${movie.release_year}-01-01` : ''),
    genre_ids: [],
    adult: false,
    original_language: 'vi',
    popularity: 0,
    vote_average: movie.vote_average || 0,
    vote_count: movie.vote_count || 0,
    video: false,
  };
}

function getApiUrl() {
  return getApiBaseUrl();
}

async function readApiJson(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Backend chưa sẵn sàng xử lý phim này. Hãy restart backend rồi thử lại.');
  }
}

export async function getMovieByTmdbId(tmdbId: number): Promise<{ movie: CatalogMovie | null; error?: string }> {
  const normalizedId = asNumber(tmdbId);
  if (!normalizedId) return { movie: null, error: 'Invalid TMDB movie id' };

  try {
    const [availableResult, movieResult] = await Promise.all([
      supabase.from('available_movies').select('*').eq('tmdb_id', normalizedId).maybeSingle(),
      supabase.from('movies').select('*').eq('tmdb_id', normalizedId).maybeSingle(),
    ]);

    if (availableResult.error && movieResult.error) {
      return { movie: null, error: availableResult.error.message || movieResult.error.message };
    }

    const mergedRow = mergeCatalogMovieRows(availableResult.data, movieResult.data);
    return { movie: mergedRow ? mapMovie(mergedRow) : null };
  } catch (error: any) {
    return { movie: null, error: error.message };
  }
}

export async function getMovieByInternalId(movieId: number): Promise<{ movie: CatalogMovie | null; error?: string }> {
  const normalizedId = asNumber(movieId);
  if (!normalizedId) return { movie: null, error: 'Invalid internal movie id' };

  try {
    const [availableResult, movieResult] = await Promise.all([
      supabase.from('available_movies').select('*').eq('id', normalizedId).maybeSingle(),
      supabase.from('movies').select('*').eq('id', normalizedId).maybeSingle(),
    ]);

    if (availableResult.error && movieResult.error) {
      return { movie: null, error: availableResult.error.message || movieResult.error.message };
    }

    const mergedRow = mergeCatalogMovieRows(availableResult.data, movieResult.data);
    return { movie: mergedRow ? mapMovie(mergedRow) : null };
  } catch (error: any) {
    return { movie: null, error: error.message };
  }
}
export async function getMoviesByInternalIds(movieIds: number[]): Promise<CatalogMovie[]> {
  if (movieIds.length === 0) return [];

  const normalizedIds = Array.from(
    new Set(movieIds.map(asNumber).filter((id): id is number => id !== null))
  );

  if (normalizedIds.length === 0) return [];

  try {
    const [{ data: availableMovies }, { data: internalMovies }] = await Promise.all([
      supabase.from('available_movies').select('*').in('id', normalizedIds),
      supabase.from('movies').select('*').in('id', normalizedIds),
    ]);

    const availableById = new Map<number, any>(
      (availableMovies || [])
        .map((row) => [Number(row.id), row] as const)
        .filter(([id]) => Number.isInteger(id) && id > 0)
    );
    const internalById = new Map<number, any>(
      (internalMovies || [])
        .map((row) => [Number(row.id), row] as const)
        .filter(([id]) => Number.isInteger(id) && id > 0)
    );

    const order = new Map(normalizedIds.map((id, index) => [id, index]));

    return normalizedIds
      .map((id) => mergeCatalogMovieRows(availableById.get(id), internalById.get(id)))
      .filter(Boolean)
      .map(mapMovie)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } catch {
    return [];
  }
}

export async function getAvailableMoviesByTmdbIds(
  tmdbIds: number[]
): Promise<{ movies: CatalogMovie[]; error?: string }> {
  const normalizedIds = Array.from(
    new Set(tmdbIds.map(asNumber).filter((id): id is number => id !== null))
  );

  if (normalizedIds.length === 0) return { movies: [] };

  try {
    const [{ data: availableMovies, error: availableError }, { data: internalMovies, error: internalError }] =
      await Promise.all([
        supabase
          .from('available_movies')
          .select('*')
          .in('tmdb_id', normalizedIds),
        supabase
          .from('movies')
          .select('*')
          .in('tmdb_id', normalizedIds),
      ]);

    if (availableError && internalError) {
      return { movies: [], error: availableError.message || internalError.message };
    }

    const order = new Map(normalizedIds.map((id, index) => [id, index]));
    const mergedByTmdbId = new Map<number, CatalogMovie>();

    [...(availableMovies || []), ...(internalMovies || [])]
      .map(mapMovie)
      .filter((movie) => typeof movie.tmdb_id === 'number')
      .forEach((movie) => {
        mergedByTmdbId.set(movie.tmdb_id as number, movie);
      });

    const movies = [...mergedByTmdbId.values()].sort(
      (a, b) => (order.get(a.tmdb_id as number) ?? 0) - (order.get(b.tmdb_id as number) ?? 0)
    );

    return { movies };
  } catch (error: any) {
    return { movies: [], error: error.message };
  }
}


export async function searchCatalogMovies(
  query: string,
  page = 1,
  limit = 24
): Promise<{ data: TMDBMoviesResponse; error?: string }> {
  const normalizedQuery = normalizeCatalogSearchText(query);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 48);

  if (!normalizedQuery) {
    return {
      data: {
        page: safePage,
        results: [],
        total_pages: 1,
        total_results: 0,
      },
    };
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/movies`);
    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return {
        data: {
          page: safePage,
          results: [],
          total_pages: 1,
          total_results: 0,
        },
        error: payload.error || 'Khong the tim phim trong thu vien noi bo.',
      };
    }

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const rankedMovies = (payload.movies || [])
      .map(mapMovie)
      .filter((movie: CatalogMovie) => movie.is_active !== false && (movie.status || 'active') === 'active')
      .map((movie: CatalogMovie) => ({
        movie,
        score: scoreCatalogMovieForSearch(movie, normalizedQuery, queryTokens),
      }))
      .filter((item: { movie: CatalogMovie; score: number }) => item.score > 0)
      .sort((a: { movie: CatalogMovie; score: number }, b: { movie: CatalogMovie; score: number }) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.movie.id - a.movie.id;
      });

    const totalResults = rankedMovies.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / safeLimit));
    const start = (safePage - 1) * safeLimit;
    const results = rankedMovies.slice(start, start + safeLimit).map((item: { movie: CatalogMovie }) => mapCatalogMovieToTmdbMovie(item.movie));

    return {
      data: {
        page: safePage,
        results,
        total_pages: totalPages,
        total_results: totalResults,
      },
    };
  } catch (error: any) {
    return {
      data: {
        page: safePage,
        results: [],
        total_pages: 1,
        total_results: 0,
      },
      error: error.message,
    };
  }
}

export async function getAvailableMovies(limit = 30): Promise<{ movies: CatalogMovie[]; error?: string }> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 60);

  try {
    const response = await fetch(`${getApiUrl()}/api/movies`);
    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return { movies: [], error: payload.error || 'Khong the tai danh sach phim noi bo.' };
    }

    const movies = (payload.movies || [])
      .map(mapMovie)
      .filter((movie: CatalogMovie) => movie.is_active !== false && (movie.status || 'active') === 'active')
      .sort((a: CatalogMovie, b: CatalogMovie) => b.id - a.id)
      .slice(0, safeLimit);

    return { movies };
  } catch (error: any) {
    return { movies: [], error: error.message };
  }
}

export async function getCatalogMoviesByGenre(
  genreId: number,
  page = 1,
  limit = 24
): Promise<{ movies: CatalogMovie[]; totalPages: number; totalResults: number; error?: string }> {
  const safePage = Math.max(Math.floor(page), 1);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 60);

  try {
    const response = await fetch(`${getApiUrl()}/api/movies?genreId=${encodeURIComponent(genreId)}`);
    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return { movies: [], totalPages: 1, totalResults: 0, error: payload.error || 'Khong the tai phim theo the loai.' };
    }

    const allMovies = (payload.movies || [])
      .map(mapMovie)
      .filter((movie: CatalogMovie) => movie.is_active !== false && (movie.status || 'active') === 'active')
      .sort((a: CatalogMovie, b: CatalogMovie) => b.id - a.id);
    const totalResults = allMovies.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / safeLimit));
    const start = (safePage - 1) * safeLimit;

    return {
      movies: allMovies.slice(start, start + safeLimit),
      totalPages,
      totalResults,
    };
  } catch (error: any) {
    return { movies: [], totalPages: 1, totalResults: 0, error: error.message };
  }
}

export async function getCatalogMoviesByYear(
  year: number,
  page = 1,
  limit = 24
): Promise<{ movies: CatalogMovie[]; totalPages: number; totalResults: number; error?: string }> {
  const safePage = Math.max(Math.floor(page), 1);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 60);

  try {
    const response = await fetch(`${getApiUrl()}/api/movies?year=${encodeURIComponent(year)}`);
    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return { movies: [], totalPages: 1, totalResults: 0, error: payload.error || 'Khong the tai phim theo nam.' };
    }

    const allMovies = (payload.movies || [])
      .map(mapMovie)
      .filter((movie: CatalogMovie) => movie.is_active !== false && (movie.status || 'active') === 'active')
      .sort((a: CatalogMovie, b: CatalogMovie) => b.id - a.id);
    const totalResults = allMovies.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / safeLimit));
    const start = (safePage - 1) * safeLimit;

    return {
      movies: allMovies.slice(start, start + safeLimit),
      totalPages,
      totalResults,
    };
  } catch (error: any) {
    return { movies: [], totalPages: 1, totalResults: 0, error: error.message };
  }
}
function getRankingView(period: MovieRankingPeriod = 'all') {
  if (period === 'week') return 'movie_rankings_weekly';
  if (period === 'month') return 'movie_rankings_monthly';
  return 'movie_rankings';
}

export async function getMovieRankings(
  limit = 10,
  period: MovieRankingPeriod = 'all'
): Promise<{ rankings: MovieRanking[]; error?: string }> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const viewName = getRankingView(period);

  try {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .order('ranking_score', { ascending: false })
      .limit(safeLimit);

    if (error) {
      return { rankings: [], error: error.message };
    }

    return { rankings: (data || []).map(mapMovieRanking) };
  } catch (error: any) {
    return { rankings: [], error: error.message };
  }
}

export async function getSimilarMoviesByInternalId(
  movieId: number,
  limit = 6
): Promise<{ movieId: number; items: SimilarMovie[]; error?: string }> {
  const normalizedId = asNumber(movieId);
  if (!normalizedId) {
    return { movieId: Number(movieId) || 0, items: [], error: 'Invalid internal movie id' };
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 24);

  try {
    const response = await fetch(`${getApiUrl()}/api/movies/${normalizedId}/similar?limit=${safeLimit}`);
    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return {
        movieId: normalizedId,
        items: [],
        error: payload.error || 'Khong the tai danh sach phim tuong tu.',
      };
    }

    return {
      movieId: Number(payload.movie_id) || normalizedId,
      items: Array.isArray(payload.items) ? payload.items.map(mapSimilarMovie) : [],
    };
  } catch (error: any) {
    return {
      movieId: normalizedId,
      items: [],
      error: error.message,
    };
  }
}

export async function ensureMovieFromTMDB(
  movie: TMDBMovieDetail
): Promise<{ movie: CatalogMovie | null; error?: string }> {
  const existing = await getMovieByTmdbId(movie.id);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return existing.movie
        ? { movie: existing.movie }
        : { movie: null, error: 'Vui lòng đăng nhập để lưu phim vào thư viện.' };
    }

    const response = await fetch(`${getApiUrl()}/api/movies/ensure-tmdb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(tmdbPayload(movie, true)),
    });

    const payload = await readApiJson(response);

    if (!response.ok || !payload.success) {
      return {
        movie: existing.movie,
        error: payload.error || 'Không thể lưu phim vào thư viện.',
      };
    }

    return { movie: mapMovie(payload.movie) };
  } catch (error: any) {
    return { movie: existing.movie, error: error.message };
  }
}

const CatalogService = {
  getMovieByTmdbId,
  getMovieByInternalId,
  getMoviesByInternalIds,
  getAvailableMoviesByTmdbIds,
  searchCatalogMovies,
  getAvailableMovies,
  getCatalogMoviesByGenre,
  getCatalogMoviesByYear,
  getMovieRankings,
  getSimilarMoviesByInternalId,
  ensureMovieFromTMDB,
};

export default CatalogService;
