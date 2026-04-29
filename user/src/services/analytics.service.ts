import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();
const SESSION_STORAGE_KEY = 'niephim_analytics_session_id';

export interface SearchLogPayload {
  query: string;
  normalized_query?: string | null;
  source_page?: string | null;
  filters_json?: Record<string, unknown> | null;
  result_count?: number | null;
  clicked_movie_id?: number | null;
}

export interface MovieClickLogPayload {
  movie_id: number;
  source_page?: string | null;
  source_module?: string | null;
  query_text?: string | null;
  recommendation_source?: string | null;
  rank_position?: number | null;
  session_id?: string | null;
}

function sanitizeText(value: unknown, maxLength = 240) {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/[<>]/g, '').trim();
  return text ? text.slice(0, maxLength) : null;
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return null;

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const nextId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextId);
  return nextId;
}

async function postAnalytics(path: string, payload: Record<string, unknown>) {
  try {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Analytics must never block user navigation or search flow.
  }
}

export function logSearchAnalytics(payload: SearchLogPayload) {
  const query = sanitizeText(payload.query, 240);
  if (!query) return;

  void postAnalytics('/api/analytics/search', {
    query,
    normalized_query: sanitizeText(payload.normalized_query, 240),
    source_page: sanitizeText(payload.source_page, 120),
    filters_json: payload.filters_json && typeof payload.filters_json === 'object' ? payload.filters_json : null,
    result_count: Number.isFinite(Number(payload.result_count)) ? Number(payload.result_count) : null,
    clicked_movie_id:
      Number.isInteger(Number(payload.clicked_movie_id)) && Number(payload.clicked_movie_id) > 0
        ? Number(payload.clicked_movie_id)
        : null,
  });
}

export function logMovieClick(payload: MovieClickLogPayload) {
  const movieId = Number(payload.movie_id);
  if (!Number.isInteger(movieId) || movieId <= 0) return;

  void postAnalytics('/api/analytics/movie-click', {
    movie_id: movieId,
    source_page: sanitizeText(payload.source_page, 120),
    source_module: sanitizeText(payload.source_module, 120),
    query_text: sanitizeText(payload.query_text, 240),
    recommendation_source: sanitizeText(payload.recommendation_source, 120),
    rank_position: Number.isInteger(Number(payload.rank_position)) ? Number(payload.rank_position) : null,
    session_id: sanitizeText(payload.session_id || getAnalyticsSessionId(), 120),
  });
}
