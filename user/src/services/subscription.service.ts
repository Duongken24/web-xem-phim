import { supabase } from '../lib/supabase';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

export interface PublicSubscriptionPlan {
  id: string;
  name: string;
  code: string;
  price: number;
  duration_days: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentUserSubscription {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  plan_id: string;
  plan_name: string | null;
  plan_duration_days: number | null;
  status: string;
  source?: string | null;
  start_date: string | null;
  end_date: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentSubscriptionPayload {
  role: string | null;
  isBlocked: boolean;
  hasPremiumAccess: boolean;
  subscription: CurrentUserSubscription | null;
}

export interface MovieContentAccess {
  movie_id: number;
  internal_movie_id?: number | null;
  movie_title: string | null;
  movie_status: string | null;
  is_hidden: boolean;
  is_featured: boolean;
  is_premium: boolean;
  is_blocked: boolean;
  is_locally_available?: boolean;
  should_hide_from_listing?: boolean;
}

export interface MovieAccessSummary {
  requiresPremium: boolean;
  hasPremiumAccess: boolean;
  isLocallyAvailable: boolean;
  canAccess: boolean;
  currentSubscription: CurrentUserSubscription | null;
}

interface ApiErrorPayload {
  success?: boolean;
  error?: string;
}

interface RequestOptions extends RequestInit {
  includeAuthToken?: boolean;
  requireAuthToken?: boolean;
}

const EMPTY_SUBSCRIPTION_STATE: CurrentSubscriptionPayload = {
  role: null,
  isBlocked: false,
  hasPremiumAccess: false,
  subscription: null,
};

const buildFallbackMovieAccess = (movieId: number) => ({
  success: true as const,
  content: {
    movie_id: movieId,
    internal_movie_id: movieId || null,
    movie_title: null,
    movie_status: null,
    is_hidden: false,
    is_featured: false,
    is_premium: false,
    is_blocked: false,
    is_locally_available: true,
    should_hide_from_listing: false,
  },
  access: {
    requiresPremium: false,
    hasPremiumAccess: false,
    isLocallyAvailable: true,
    canAccess: true,
    currentSubscription: null,
  },
});

const requestWithOptionalAuth = async <T>(path: string, init: RequestOptions = {}): Promise<T> => {
  const { includeAuthToken = false, requireAuthToken = false, ...requestInit } = init;
  const headers = new Headers(requestInit.headers || {});

  if (!(requestInit.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeAuthToken || requireAuthToken) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    } else if (requireAuthToken) {
      throw new Error('Ban can dang nhap de su dung tinh nang nay.');
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers,
  });

  let payload: (T & ApiErrorPayload) | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Khong the tai du lieu dang ky.');
  }

  return (payload || {}) as T;
};

export const getPublicPlans = async () => {
  try {
    return await requestWithOptionalAuth<{ success: true; plans: PublicSubscriptionPlan[] }>('/api/subscriptions/plans');
  } catch {
    return { success: true as const, plans: [] };
  }
};

export const getCurrentSubscription = async () => {
  try {
    return await requestWithOptionalAuth<{ success: true } & CurrentSubscriptionPayload>('/api/subscriptions/me', {
      requireAuthToken: true,
    });
  } catch {
    return {
      success: true as const,
      ...EMPTY_SUBSCRIPTION_STATE,
    };
  }
};

export const getMovieContentAccess = async (movieId: number) => {
  try {
    return await requestWithOptionalAuth<{
      success: true;
      content: MovieContentAccess;
      access: MovieAccessSummary;
    }>(`/api/content-access/${movieId}`, {
      includeAuthToken: true,
    });
  } catch {
    return buildFallbackMovieAccess(movieId);
  }
};

export const getBatchContentAccess = async (movieIds: number[]) => {
  try {
    return await requestWithOptionalAuth<{
      success: true;
      content: MovieContentAccess[];
    }>('/api/content-access/batch', {
      method: 'POST',
      body: JSON.stringify({ movieIds }),
    });
  } catch {
    return {
      success: true as const,
      content: (Array.isArray(movieIds) ? movieIds : []).map((movieId) => buildFallbackMovieAccess(movieId).content),
    };
  }
};
