import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from './api';
import { USE_TMDB } from '../config/featureFlags';

const API_BASE_URL = getApiBaseUrl();
const AI_REQUEST_TIMEOUT_MS = 6000;

export interface AiRecommendationMovie {
  movie_id: number | null;
  internal_movie_id?: number | null;
  tmdb_id: number | null;
  title: string;
  original_title: string | null;
  slug?: string | null;
  poster_path: string | null;
  poster_url: string | null;
  release_year: number | null;
  average_rating: number;
  score: number;
  reason: string;
  reason_tags?: string[];
  source: string;
  source_type?: string | null;
  has_play_source?: boolean;
  availability?: 'internal' | 'tmdb_only';
  action_type?: 'watch_now' | 'view_detail';
}

export interface AiRecommendationResult {
  source: string;
  warning: string;
  explanation: string;
  normalizedQuery: string;
  currentMovieId: number | null;
  detectedFilters: Record<string, unknown>;
  movies: AiRecommendationMovie[];
}

interface RequestAiMovieRecommendationsInput {
  query: string;
  topN?: number;
  currentMovieId?: number | null;
}

function sanitizeAiQuery(query: string): string {
  return query.replace(/[<>]/g, '').trim().slice(0, 240);
}

export async function requestAiMovieRecommendations({
  query,
  topN = 10,
  currentMovieId = null,
}: RequestAiMovieRecommendationsInput): Promise<AiRecommendationResult> {
  const nextQuery = sanitizeAiQuery(query);
  if (!nextQuery) {
    throw new Error('Vui long nhap gu phim hoac tam trang muon xem.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response: Response;
  let responseText = '';

  try {
    response = await fetch(`${API_BASE_URL}/api/ai/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: nextQuery,
        top_n: topN,
        current_movie_id: typeof currentMovieId === 'number' && currentMovieId > 0 ? currentMovieId : null,
        only_database_movies: !USE_TMDB,
      }),
      signal: controller.signal,
    });

    responseText = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI dang phan hoi cham. Vui long thu lai sau.');
    }

    throw new Error('Khong the ket noi toi goi y AI luc nay.');
  } finally {
    clearTimeout(timeout);
  }

  let payload: any = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    if (response.status === 404) {
      throw new Error('Backend chua san sang cho API goi y phim.');
    }

    throw new Error('Backend tra ve du lieu AI khong hop le.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'AI tam thoi chua san sang.');
  }

  const movies = Array.isArray(payload.movies)
    ? payload.movies
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.recommended_movies)
        ? payload.recommended_movies
        : [];

  return {
    source: payload.source === 'ai_service' ? 'chat' : payload.source || 'chat',
    warning: typeof payload.warning === 'string' ? payload.warning : '',
    explanation: typeof payload.explanation === 'string' ? payload.explanation : '',
    normalizedQuery: payload.normalizedQuery || payload.normalized_query || nextQuery,
    currentMovieId:
      typeof payload.current_movie_id === 'number' && payload.current_movie_id > 0
        ? payload.current_movie_id
        : typeof currentMovieId === 'number' && currentMovieId > 0
          ? currentMovieId
          : null,
    detectedFilters:
      payload.detectedFilters && typeof payload.detectedFilters === 'object'
        ? payload.detectedFilters
        : payload.detected_filters && typeof payload.detected_filters === 'object'
          ? payload.detected_filters
          : {},
    movies,
  };
}
