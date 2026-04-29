import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

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
    throw new Error('Bạn hãy nhập gu phim hoặc tâm trạng muốn xem.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/movie-recommendations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: nextQuery,
      top_n: topN,
      current_movie_id: typeof currentMovieId === 'number' && currentMovieId > 0 ? currentMovieId : null,
    }),
  });

  const responseText = await response.text();
  let payload: any = {};

  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    if (response.status === 404) {
      throw new Error('Backend chưa nhận API gợi ý phim. Hãy restart backend rồi thử lại.');
    }

    throw new Error('Backend trả về dữ liệu không hợp lệ. Hãy kiểm tra terminal backend.');
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Không thể lấy gợi ý lúc này.');
  }

  const movies = Array.isArray(payload.movies)
    ? payload.movies
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  return {
    source: payload.source || 'chat',
    warning: payload.warning || '',
    explanation: payload.explanation || '',
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
