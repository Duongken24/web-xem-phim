import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Play } from 'lucide-react';
import { useMovieDetails } from '../hooks/useTMDB';
import { useMovieProgress } from '../hooks/useWatchHistory';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import VideoPlayer from '../components/movie/VideoPlayer';
import CatalogService, { type CatalogMovie } from '../services/catalog.service';
import { getApiBaseUrl } from '../services/api';
import { USE_TMDB } from '../config/featureFlags';

interface StreamPayload {
  success: boolean;
  movie_id?: number;
  episode_id?: number | null;
  source_type?: 'direct' | 'r2' | 's3' | 'hls' | 'mp4' | string;
  sourceType?: 'direct' | 'r2' | 's3' | 'hls' | 'mp4' | string;
  url: string;
  mime_type?: string | null;
  quality_label?: string | null;
  is_hls?: boolean;
  poster?: string | null;
  title?: string | null;
  movie?: {
    id: number;
    tmdb_id: number;
    title: string;
    video_url?: string | null;
  };
  error?: string;
}

function normalizeMessage(message: string) {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getFriendlyStreamError(message: string) {
  const normalized = normalizeMessage(message);

  if (normalized.includes('chua co nguon phat') || normalized.includes('chua duoc map')) {
    return 'Phim này chưa có nguồn phát, vui lòng quay lại sau.';
  }

  if (normalized.includes('premium')) {
    return 'Nguồn phát này yêu cầu tài khoản premium đang hoạt động.';
  }

  if (normalized.includes('dang nhap') || normalized.includes('access token')) {
    return 'Vui lòng đăng nhập lại để tiếp tục xem phim.';
  }

  return message;
}

function normalizeStreamUrl(url: string | null | undefined) {
  return typeof url === 'string' ? url.trim() : '';
}

export default function WatchPageCatalog() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const routeMovieId = Number(id || 0);
  const isInternalWatchRoute = location.pathname.startsWith('/watch/id/');
  const episodeId = Number(searchParams.get('episodeId') || 0) || null;
  const { user } = useAuth();
  const {
    movie: tmdbMovie,
    loading: tmdbLoading,
    error: movieError,
  } = useMovieDetails(!isInternalWatchRoute && routeMovieId && USE_TMDB ? routeMovieId : null);

  const [catalogMovie, setCatalogMovie] = useState<CatalogMovie | null>(null);
  const [catalogMovieLoading, setCatalogMovieLoading] = useState(isInternalWatchRoute);
  const [catalogMovieError, setCatalogMovieError] = useState<string | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [streamPayload, setStreamPayload] = useState<StreamPayload | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [catalogMovieId, setCatalogMovieId] = useState<number | null>(null);
  const [catalogEpisodeId, setCatalogEpisodeId] = useState<number | null>(episodeId);
  const [mediaDuration, setMediaDuration] = useState(0);
  const { progress, saveProgress, forceSaveProgress } = useMovieProgress(catalogMovieId, catalogEpisodeId);

  const initialProgressRatio =
    progress && progress.duration > 0 ? Math.min(1, Math.max(0, progress.watchPosition / progress.duration)) : 0;
  const latestPlaybackRef = useRef({
    playedSeconds: 0,
    duration: 0,
  });
  const activeTargetRef = useRef<{
    movieId: number | null;
    episodeId: number | null;
  }>({
    movieId: null,
    episodeId,
  });
  const lastForceSaveKeyRef = useRef('');
  const flushProgressOnExitRef = useRef<() => void>(() => undefined);

  const rememberPlayback = useCallback((playedSeconds: number, duration: number) => {
    latestPlaybackRef.current = {
      playedSeconds: Math.max(0, playedSeconds),
      duration: Math.max(0, duration),
    };
  }, []);

  const forceSaveLatestProgress = useCallback(
    (playedSeconds: number, duration: number) => {
      const normalizedDuration = Math.floor(duration);
      const normalizedPlayedSeconds = Math.min(normalizedDuration, Math.floor(playedSeconds));
      const { movieId, episodeId: targetEpisodeId } = activeTargetRef.current;

      if (!movieId || normalizedDuration <= 0 || normalizedPlayedSeconds <= 0) return;

      const nextKey = `${movieId}:${targetEpisodeId ?? 'movie'}:${normalizedPlayedSeconds}:${normalizedDuration}`;
      if (lastForceSaveKeyRef.current === nextKey) return;

      lastForceSaveKeyRef.current = nextKey;
      void forceSaveProgress(normalizedPlayedSeconds, normalizedDuration);
    },
    [forceSaveProgress]
  );

  useEffect(() => {
    if (catalogMovieId) {
      activeTargetRef.current = {
        movieId: catalogMovieId,
        episodeId: catalogEpisodeId,
      };
      lastForceSaveKeyRef.current = '';
      latestPlaybackRef.current = {
        playedSeconds: 0,
        duration: 0,
      };
    }
  }, [catalogEpisodeId, catalogMovieId]);

  useEffect(() => {
    flushProgressOnExitRef.current = () => {
      const { playedSeconds, duration } = latestPlaybackRef.current;
      forceSaveLatestProgress(playedSeconds, duration);
    };
  }, [forceSaveLatestProgress]);

  useEffect(() => {
    const flushProgress = () => {
      flushProgressOnExitRef.current();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress();
      }
    };

    window.addEventListener('pagehide', flushProgress);
    window.addEventListener('beforeunload', flushProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushProgress);
      window.removeEventListener('beforeunload', flushProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushProgressOnExitRef.current();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCatalogMovie = async () => {
      if (!routeMovieId) {
        setCatalogMovie(null);
        setCatalogMovieError(null);
        setCatalogMovieLoading(false);
        return;
      }

      if (!isInternalWatchRoute && USE_TMDB) {
        setCatalogMovie(null);
        setCatalogMovieError(null);
        setCatalogMovieLoading(false);
        return;
      }

      setCatalogMovieLoading(true);
      setCatalogMovieError(null);
      const { movie, error } = isInternalWatchRoute
        ? await CatalogService.getMovieByInternalId(routeMovieId)
        : await CatalogService.getMovieByTmdbId(routeMovieId);

      if (isMounted) {
        setCatalogMovie(movie);
        setCatalogMovieError(error || null);
        setCatalogMovieLoading(false);
      }
    };

    void loadCatalogMovie();

    return () => {
      isMounted = false;
    };
  }, [isInternalWatchRoute, routeMovieId]);

  useEffect(() => {
    if (!routeMovieId || !user?.id) {
      setStreamPayload(null);
      setStreamUrl('');
      setStreamError(null);
      setCatalogMovieId(null);
      setCatalogEpisodeId(episodeId);
      setIsPlayerLoading(false);
      return;
    }

    const fetchStream = async () => {
      try {
        setIsPlayerLoading(true);
        setStreamError(null);
        setStreamUrl('');
        setStreamPayload(null);
        setCatalogMovieId(null);
        setCatalogEpisodeId(episodeId);
        setMediaDuration(0);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Vui lòng đăng nhập lại để xem phim.');
        }

        const apiUrl = getApiBaseUrl();
        const query = episodeId ? `?episodeId=${episodeId}` : '';
        const endpoint = isInternalWatchRoute
          ? `${apiUrl}/api/stream/movie/${routeMovieId}${query}`
          : `${apiUrl}/api/stream/${routeMovieId}${query}`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data: StreamPayload = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Không lấy được nguồn phát.');

        const nextStreamUrl = normalizeStreamUrl(data.url);
        if (!nextStreamUrl) {
          throw new Error('Phim này chưa có nguồn phát, vui lòng quay lại sau.');
        }

        setStreamPayload(data);
        setStreamUrl(nextStreamUrl);
        setCatalogMovieId(data.movie_id ?? data.movie?.id ?? null);
        setCatalogEpisodeId(data.episode_id ?? episodeId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không lấy được nguồn phát.';
        console.error('Watch stream error:', message);
        setStreamError(getFriendlyStreamError(message));
      } finally {
        setIsPlayerLoading(false);
      }
    };

    void fetchStream();
  }, [routeMovieId, isInternalWatchRoute, episodeId, user?.id]);

  const useCatalogWatchData = isInternalWatchRoute || !USE_TMDB;
  const loading = useCatalogWatchData ? catalogMovieLoading : tmdbLoading;
  const pageTitle = catalogMovie?.title || streamPayload?.title || tmdbMovie?.title || 'Phim';
  const pageOverview = catalogMovie?.overview || tmdbMovie?.overview || 'Chưa có mô tả cho phim này.';
  const detailHref = isInternalWatchRoute ? `/movie/id/${routeMovieId}` : `/movie/${routeMovieId}`;
  const loginState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-t-2 border-red-500" />
          <h1 className="text-2xl font-bold">Đang tải thông tin phim</h1>
          <p className="mt-2 text-sm text-gray-400">Vui lòng chờ trong giây lát để Thêm Phim chuẩn bị nguồn phát.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950/80 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold">Bạn cần đăng nhập để xem phim</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Đăng nhập để tiếp tục xem phim và quay lại đúng nội dung bạn vừa chọn.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              state={loginState}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Đăng nhập
            </Link>
            <Link
              to={detailHref}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:border-white/20"
            >
              Quay lại chi tiết phim
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if ((!useCatalogWatchData && (movieError || !tmdbMovie)) || (useCatalogWatchData && catalogMovieError && !catalogMovie && !streamPayload)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-zinc-950/80 p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold">Không tìm thấy phim</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Bộ phim này có thể không còn khả dụng hoặc chưa được chuẩn bị để phát.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={detailHref}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Về trang chi tiết
            </Link>
            <Link
              to="/"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:border-white/20"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <Link to={detailHref} className="flex items-center gap-2 transition hover:text-red-500">
          <ArrowLeft /> Quay lại
        </Link>
        <div className="text-right">
          <h2 className="max-w-xs truncate font-bold">{pageTitle}</h2>
          {streamPayload?.quality_label && (
            <div className="text-xs text-gray-400">
              {streamPayload.quality_label} · {(streamPayload.source_type || streamPayload.sourceType || 'stream').toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900 shadow-2xl">
          {isPlayerLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-red-500" />
            </div>
          )}

          {streamError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="mb-2 text-red-500" size={40} />
              <p className="max-w-md text-red-400">{streamError}</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-black"
                >
                  Tải lại
                </button>
                <Link
                  to={detailHref}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-sm font-bold text-white transition hover:border-white/20"
                >
                  Về trang chi tiết
                </Link>
              </div>
            </div>
          ) : streamUrl ? (
            <VideoPlayer
              url={streamUrl}
              title={streamPayload?.title || pageTitle}
              mimeType={streamPayload?.mime_type || null}
              initialProgress={initialProgressRatio}
              autoPlay
              onDuration={(duration) => {
                rememberPlayback(latestPlaybackRef.current.playedSeconds, duration);
                setMediaDuration(duration);
                setIsPlayerLoading(false);
              }}
              onProgress={({ playedSeconds }) => {
                const duration = latestPlaybackRef.current.duration || mediaDuration;
                rememberPlayback(playedSeconds, duration);
                if (catalogMovieId && mediaDuration > 0) {
                  void saveProgress(Math.floor(playedSeconds), Math.floor(mediaDuration));
                }
              }}
              onPause={({ playedSeconds, duration }) => {
                rememberPlayback(playedSeconds, duration);
                forceSaveLatestProgress(playedSeconds, duration);
              }}
              onBeforeUnmount={({ playedSeconds, duration }) => {
                rememberPlayback(playedSeconds, duration);
                forceSaveLatestProgress(playedSeconds, duration);
              }}
              onEnded={() => {
                const duration = latestPlaybackRef.current.duration || mediaDuration;
                rememberPlayback(duration, duration);
                forceSaveLatestProgress(duration, duration);
              }}
            />
          ) : (
            !isPlayerLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <Play className="mb-3 h-12 w-12 text-gray-400" />
                <p className="max-w-md text-gray-300">
                  Phim này chưa có nguồn phát, vui lòng quay lại sau.
                </p>
                <Link
                  to={detailHref}
                  className="mt-4 rounded-full border border-white/10 px-4 py-1.5 text-sm font-bold text-white transition hover:border-white/20"
                >
                  Về trang chi tiết
                </Link>
              </div>
            )
          )}
        </div>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          <p className="mt-4 max-w-3xl leading-relaxed text-gray-400">
            {pageOverview}
          </p>
        </div>
      </div>
    </div>
  );
}
