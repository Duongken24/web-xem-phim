import { supabase } from '../lib/supabase';

import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

export interface AdminStatsSummary {
  totalUsers: number;
  totalAdmins: number;
  totalNormalUsers: number;
  blockedUsers: number;
  totalPlans: number;
  activePlans: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  hiddenContent: number;
  premiumContent: number;
  featuredContent: number;
  blockedContent: number;
}

export interface AdminUserSubscription {
  id: string;
  plan_id: string | null;
  plan_name: string | null;
  status: string;
  source?: string | null;
  end_date: string | null;
}

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_blocked: boolean;
  created_at?: string | null;
  watch_count?: number;
  favorite_count?: number;
  rating_count?: number;
  last_watched_at?: string | null;
  current_subscription?: AdminUserSubscription | null;
}

export interface SubscriptionPlan {
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

export interface AdminSubscription {
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

export interface ContentControl {
  id: string;
  movie_id: number;
  internal_movie_id?: number | null;
  movie_title: string | null;
  is_hidden: boolean;
  is_featured: boolean;
  is_premium: boolean;
  is_blocked: boolean;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface AdminGenre {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
}

export interface AdminCountry {
  id: number;
  name: string;
  code?: string | null;
}

export interface AdminMovie {
  id: number;
  tmdb_id: number | null;
  imdb_id?: string | null;
  title: string;
  original_title: string | null;
  slug?: string | null;
  description?: string | null;
  overview: string | null;
  trailer_url?: string | null;
  poster_url?: string | null;
  poster_path: string | null;
  backdrop_url?: string | null;
  backdrop_path: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  release_date: string | null;
  release_year: number | null;
  duration?: number | null;
  runtime_minutes?: number | null;
  age_rating?: string | null;
  original_language?: string | null;
  origin_country?: string | null;
  country_id?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  rating?: number | null;
  average_rating?: number | null;
  total_ratings?: number | null;
  view_count?: number | null;
  video_url: string | null;
  stream_url?: string | null;
  source_type: string | null;
  type?: string | null;
  status: string | null;
  is_featured: boolean;
  is_trending?: boolean;
  is_active: boolean;
  is_premium?: boolean;
  deleted_at?: string | null;
  updated_at?: string | null;
  genres?: number[];
  sources?: AdminMovieSource[];
  episodes?: AdminEpisode[];
  has_play_source?: boolean;
}

export interface AdminMovieSource {
  id: string | number;
  movie_id: number;
  source_type: string | null;
  quality_label: string | null;
  video_url: string | null;
  object_key: string | null;
  public_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  is_primary: boolean;
  is_active: boolean;
  storage_provider: string | null;
}

export interface AdminEpisode {
  id: number;
  movie_id: number;
  episode_number: number;
  title: string | null;
  video_url?: string | null;
}

export interface AdminMovieUpsertPayload {
  movie_id?: number | null;
  tmdb_id?: number | null;
  imdb_id?: string | null;
  title: string;
  original_title?: string | null;
  slug?: string | null;
  description?: string | null;
  overview?: string | null;
  trailer_url?: string | null;
  poster_url?: string | null;
  poster_path?: string | null;
  backdrop_url?: string | null;
  backdrop_path?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  release_date?: string | null;
  release_year?: number | null;
  duration?: number | null;
  runtime_minutes?: number | null;
  age_rating?: string | null;
  original_language?: string | null;
  origin_country?: string | null;
  country_id?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  rating?: number | null;
  average_rating?: number | null;
  total_ratings?: number | null;
  view_count?: number | null;
  type?: string | null;
  status?: string | null;
  is_featured?: boolean;
  is_trending?: boolean;
  is_active?: boolean;
  is_premium?: boolean;
  video_url?: string | null;
  stream_url?: string | null;
  source_type?: string | null;
  genres?: number[];
}

export interface AdminMoviesMetaPayload {
  genres: AdminGenre[];
  countries: AdminCountry[];
  storage?: AdminStorageHealth;
}

export interface DashboardPayload {
  stats: AdminStatsSummary;
  recentUsers: AdminUser[];
  recentSubscriptions: AdminSubscription[];
}

export interface AdminStorageHealth {
  ok: boolean;
  configured: boolean;
  provider: string;
  bucketName: string;
  endpoint: string;
  publicBaseUrl: string;
  region: string;
  signedUrlTtl: number;
  forceSignedUrls: boolean;
  missingConfigKeys: string[];
  error?: string;
}

export interface AdminSystemSettings {
  use_tmdb: boolean;
}

interface ApiErrorPayload {
  success?: boolean;
  error?: string;
}

const adminRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Ban can dang nhap bang tai khoan admin de su dung tinh nang nay.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  let payload: (T & ApiErrorPayload) | null = null;

  try {
    const text = await response.text();
    if (text) {
      payload = JSON.parse(text);
    }
  } catch (error) {
    console.error('[AdminService] Failed to parse response:', error);
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const error = payload?.error || 'Admin request failed.';
    throw new Error(error);
  }

  return (payload || {}) as T;
};

const toQueryString = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim()) {
      searchParams.set(key, value.trim());
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const getDashboard = async () => {
  return adminRequest<DashboardPayload & { success: true }>('/api/admin/dashboard');
};

export const getStats = async () => {
  return adminRequest<{ success: true; stats: AdminStatsSummary }>('/api/admin/stats');
};

export const getUsers = async (query = '') => {
  return adminRequest<{ success: true; users: AdminUser[] }>(`/api/admin/users${toQueryString({ q: query })}`);
};

export const createAdminUser = async (payload: {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
}) => {
  return adminRequest<{ success: true; user: unknown; profile: AdminUser }>('/api/create-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateUserRole = async (userId: string, role: string) => {
  return adminRequest<{ success: true; profile: AdminUser }>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

export const updateUserBlock = async (userId: string, isBlocked: boolean) => {
  return adminRequest<{ success: true; profile: AdminUser }>(`/api/admin/users/${userId}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ isBlocked }),
  });
};

export const getPlans = async () => {
  return adminRequest<{ success: true; plans: SubscriptionPlan[] }>('/api/admin/plans');
};

export const createPlan = async (payload: {
  name: string;
  code: string;
  price: number;
  durationDays: number;
  description?: string;
  isActive?: boolean;
}) => {
  return adminRequest<{ success: true; plan: SubscriptionPlan }>('/api/admin/plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updatePlan = async (
  planId: string,
  payload: Partial<{
    name: string;
    code: string;
    price: number;
    durationDays: number;
    description: string;
    isActive: boolean;
  }>
) => {
  return adminRequest<{ success: true; plan: SubscriptionPlan }>(`/api/admin/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getSubscriptions = async () => {
  return adminRequest<{ success: true; subscriptions: AdminSubscription[] }>('/api/admin/subscriptions');
};

export const assignSubscription = async (payload: {
  userId: string;
  planId: string;
  startDate?: string;
  status?: string;
}) => {
  return adminRequest<{ success: true; subscription: AdminSubscription }>('/api/admin/subscriptions/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateSubscription = async (
  subscriptionId: string,
  payload: Partial<{
    status: string;
    startDate: string;
    endDate: string;
  }>
) => {
  return adminRequest<{ success: true; subscription: AdminSubscription }>(`/api/admin/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getContentControls = async (query = '') => {
  return adminRequest<{ success: true; content: ContentControl[] }>(
    `/api/admin/content${toQueryString({ q: query })}`
  );
};

export const getAdminMovies = async () => {
  return adminRequest<{ success: true; movies: AdminMovie[] }>('/api/admin/movies');
};

export const getAdminMoviesMeta = async () => {
  return adminRequest<{ success: true } & AdminMoviesMetaPayload>('/api/admin/movies/meta');
};

export const upsertAdminMovie = async (payload: AdminMovieUpsertPayload) => {
  return adminRequest<{ success: true; action: 'inserted' | 'updated'; movie: AdminMovie }>(
    '/api/admin/movies/upsert',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
};

export const deleteAdminMovie = async (movieId: number) => {
  return adminRequest<{ success: true; movie_id: number; action: 'soft_delete' }>(`/api/admin/movies/${movieId}`, {
    method: 'DELETE',
  });
};

export const getAdminStorageHealth = async () => {
  return adminRequest<{ success: boolean; storage: AdminStorageHealth }>('/api/admin/storage/health');
};

export const getAdminSettings = async () => {
  return adminRequest<{ success: true; use_tmdb?: boolean; settings?: AdminSystemSettings }>('/api/admin/settings');
};

export const updateAdminUseTmdb = async (enabled: boolean) => {
  return adminRequest<{ success: true; use_tmdb: boolean; settings?: AdminSystemSettings }>('/api/admin/settings/use-tmdb', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
};

export const uploadAdminMovieVideo = async (
  movieId: number,
  file: File,
  options: {
    qualityLabel?: string;
    isPrimary?: boolean;
    isActive?: boolean;
    episodeId?: number | null;
  } = {}
) => {
  const formData = new FormData();
  formData.set('video', file);

  if (options.qualityLabel?.trim()) {
    formData.set('quality_label', options.qualityLabel.trim());
  }

  if (options.episodeId) {
    formData.set('episode_id', String(options.episodeId));
  }

  formData.set('is_primary', String(options.isPrimary ?? true));
  formData.set('is_active', String(options.isActive ?? true));
  formData.set('source_type', 'r2');

  return adminRequest<{
    success: true;
    movie_id: number;
    upload: {
      provider: string;
      bucketName: string;
      objectKey: string;
      publicUrl: string | null;
      url: string | null;
    };
    source?: AdminMovieSource;
    quality?: unknown;
    url?: string | null;
    object_key?: string | null;
  }>(`/api/admin/movies/${movieId}/upload-video`, {
    method: 'POST',
    body: formData,
  });
};

export const uploadMovieVideo = uploadAdminMovieVideo;

export const upsertContentControl = async (payload: {
  movieId: number;
  isHidden?: boolean;
  isFeatured?: boolean;
  isPremium?: boolean;
  isBlocked?: boolean;
  note?: string;
}) => {
  return adminRequest<{ success: true; content: ContentControl }>('/api/admin/content/upsert', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export interface WatchStat {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  movie_id: number;
  tmdb_id: number | null;
  movie_title: string;
  release_year: number | null;
  watch_position: number;
  watched_minutes: number;
  total_minutes: number;
  progress_percent: number;
  last_watched_at: string;
}

export interface WatchStatsSummary {
  totalWatchEntries: number;
  totalUsers: number;
  totalMovies: number;
  averageProgress: number;
}

export const getWatchStats = async () => {
  return adminRequest<{ success: true; watchStats: WatchStat[]; summary: WatchStatsSummary }>('/api/admin/watch-stats');
};


