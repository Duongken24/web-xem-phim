import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, History, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { useWatchHistory } from '../hooks/useWatchHistory';
import TMDBService from '../services/tmdb.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { WATCH_THRESHOLDS } from '../utils/constants';

function getHistoryDetailHref(movie: {
  internalMovieId?: number | null;
  tmdbId?: number | null;
  id: number;
}) {
  if (typeof movie.internalMovieId === 'number' && movie.internalMovieId > 0) {
    return `/movie/id/${movie.internalMovieId}`;
  }

  if (typeof movie.tmdbId === 'number' && movie.tmdbId > 0) {
    return `/movie/${movie.tmdbId}`;
  }

  return `/movie/${movie.id}`;
}

function getHistoryWatchHref(movie: {
  internalMovieId?: number | null;
  tmdbId?: number | null;
  episodeId?: number | null;
  id: number;
}) {
  const basePath =
    typeof movie.internalMovieId === 'number' && movie.internalMovieId > 0
      ? `/watch/id/${movie.internalMovieId}`
      : typeof movie.tmdbId === 'number' && movie.tmdbId > 0
        ? `/watch/${movie.tmdbId}`
        : `/watch/${movie.id}`;

  return movie.episodeId ? `${basePath}?episodeId=${movie.episodeId}` : basePath;
}

function getHistoryPosterUrl(path: string | null) {
  if (!path) return TMDBService.getTMDBFallbackImage('poster');
  if (/^https?:\/\//i.test(path)) return path;
  return TMDBService.getTMDBImageUrl(path, 'w500', 'poster');
}

function formatEpisodeLabel(episodeId: number | null | undefined) {
  return typeof episodeId === 'number' && episodeId > 0 ? `Tập ${episodeId}` : null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 24 * 365],
    ['month', 60 * 24 * 30],
    ['day', 60 * 24],
    ['hour', 60],
    ['minute', 1],
  ];

  for (const [unit, minutesInUnit] of ranges) {
    if (Math.abs(diffMinutes) >= minutesInUnit || unit === 'minute') {
      return rtf.format(Math.round(diffMinutes / minutesInUnit), unit);
    }
  }

  return 'Vừa xong';
}

function formatWatchTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 phút';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${Math.max(1, minutes)} phút`;
  if (minutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function getHistoryStatus(progressPercent: number) {
  if (progressPercent >= WATCH_THRESHOLDS.CONSIDERED_WATCHED) {
    return {
      label: 'Đã xem',
      description: 'Bạn đã xem gần như trọn bộ phim này.',
      ctaLabel: 'Xem lại',
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
      progressClass: 'bg-emerald-500',
      isCompleted: true,
    };
  }

  if (progressPercent >= WATCH_THRESHOLDS.CONTINUE_WATCHING) {
    return {
      label: 'Đang xem dở',
      description: 'Tiếp tục từ đúng đoạn phim bạn đang theo dõi.',
      ctaLabel: 'Xem tiếp',
      toneClass: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
      progressClass: 'bg-red-600',
      isCompleted: false,
    };
  }

  return {
    label: 'Mới bắt đầu',
    description: 'Bạn mới xem một phần nhỏ và có thể tiếp tục bất cứ lúc nào.',
    ctaLabel: 'Tiếp tục',
    toneClass: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    progressClass: 'bg-sky-500',
    isCompleted: false,
  };
}

const HistoryPage: React.FC = () => {
  const { historyItems, loading, error, refreshHistory } = useWatchHistory();

  const totalWatched = useMemo(
    () => historyItems.reduce((sum, item) => sum + (item.watchPosition || 0), 0),
    [historyItems]
  );

  const inProgressCount = useMemo(
    () =>
      historyItems.filter(
        (item) =>
          item.progressPercent >= WATCH_THRESHOLDS.CONTINUE_WATCHING &&
          item.progressPercent < WATCH_THRESHOLDS.CONSIDERED_WATCHED
      ).length,
    [historyItems]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-white/10 bg-gray-950/80 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <LoadingSpinner />
              <div>
                <h1 className="text-2xl font-bold text-white">Đang tải lịch sử xem</h1>
                <p className="mt-2 text-sm text-gray-400">Thêm Phim đang lấy lại những phim bạn đã xem gần đây.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-red-500/20 bg-gray-950/80 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-red-500/10 p-4 text-red-400">
              <History className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">Không thể tải lịch sử xem</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">{error}</p>
            <button
              type="button"
              onClick={() => refreshHistory()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white/5 p-4 text-gray-300">
              <History className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-white">Lịch sử xem đang trống</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Hãy mở một bộ phim và xem vài phút để lịch sử xem xuất hiện tại đây.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Khám phá phim
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-16 pt-24">
      <div className="container mx-auto space-y-8 px-4 md:px-8 lg:px-16">
        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
                <History className="h-4 w-4" />
                Tài khoản của bạn
              </div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Lịch sử xem</h1>
              <p className="mt-3 text-sm leading-7 text-gray-400 md:text-base">
                Theo dõi những bộ phim bạn đã mở gần đây và tiếp tục xem chỉ với một cú nhấp.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Đã xem gần đây</p>
                <p className="mt-1 text-sm font-semibold text-white">{historyItems.length} phim</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Đang xem dở</p>
                <p className="mt-1 text-sm font-semibold text-white">{inProgressCount} phim</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Thời gian đã lưu</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatWatchTime(totalWatched)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {historyItems.map((movie) => {
            const status = getHistoryStatus(movie.progressPercent);
            const detailHref = getHistoryDetailHref(movie);
            const watchHref = getHistoryWatchHref(movie);
            const episodeLabel = formatEpisodeLabel(movie.episodeId);

            return (
              <article
                key={movie.id}
                className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950/80 shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
              >
                <div className="flex flex-col gap-5 p-4 md:flex-row md:items-center md:p-5">
                  <Link to={detailHref} className="w-full md:w-[120px] lg:w-[140px]">
                    <img
                      src={getHistoryPosterUrl(movie.poster_path)}
                      alt={movie.title}
                      className="aspect-[2/3] w-full rounded-2xl object-cover"
                      onError={(event) => {
                        event.currentTarget.src = TMDBService.getTMDBFallbackImage('poster');
                      }}
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link to={detailHref} className="transition hover:text-red-400">
                            <h2 className="line-clamp-2 text-xl font-semibold text-white">{movie.title}</h2>
                          </Link>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${status.toneClass}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
                          {movie.vote_average > 0 && <span>★ {movie.vote_average.toFixed(1)}/10</span>}
                          {episodeLabel && <span>{episodeLabel}</span>}
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-4 w-4" />
                            {formatRelativeTime(movie.lastWatchedAt)}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={watchHref}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        {status.isCompleted ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-white" />
                        )}
                        {status.ctaLabel}
                      </Link>
                    </div>

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">
                      {movie.overview || 'Bộ phim này hiện chưa có mô tả.'}
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/5 bg-black/25 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            {status.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Play className="h-4 w-4 fill-red-500 text-red-500" />
                            )}
                            <span>{status.label}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-gray-400">{status.description}</p>
                        </div>
                        <div className="text-sm text-gray-300">
                          {movie.progressPercent}% • {formatWatchTime(movie.watchPosition)}
                          {movie.duration > 0 ? ` / ${formatWatchTime(movie.duration)}` : ''}
                        </div>
                      </div>

                      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${status.progressClass}`}
                          style={{ width: `${movie.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default HistoryPage;
