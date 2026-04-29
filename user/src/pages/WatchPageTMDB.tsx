import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Film, Lock, Settings } from 'lucide-react';
import { useMovieDetails } from '../hooks/useTMDB';
import TMDBService from '../services/tmdb.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function WatchPageTMDB() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id || 0);
  const { movie, loading, error } = useMovieDetails(movieId || null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <LoadingSpinner text="Đang tải thông tin phim..." />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
        <Film className="mb-4 h-12 w-12 text-red-400" />
        <h1 className="text-2xl font-bold">Không tìm thấy phim trên TMDB</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
          {error instanceof Error ? error.message : 'Movie id không hợp lệ hoặc TMDB chưa trả dữ liệu.'}
        </p>
        <Link to="/" className="mt-6 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const backdropUrl = TMDBService.getTMDBImageUrl(
    movie.backdrop_path || movie.poster_path,
    'w1280',
    'backdrop'
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/55" />

        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 md:px-8">
          <Link
            to={`/movie/${movie.id}`}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-gray-200 backdrop-blur transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại chi tiết
          </Link>

          <div className="flex flex-1 items-center justify-center py-16">
            <section className="w-full rounded-[2rem] border border-white/10 bg-gray-950/85 p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur md:p-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                <Lock className="h-8 w-8" />
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">{movie.title}</h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-300 md:text-base">
                Metadata phim dang duoc lay tu TMDB. Nguon phat Cloudflare R2 duoc quan ly trong Admin.
              </p>

              <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">TMDB ID</p>
                  <p className="mt-1 text-sm font-semibold text-white">{movie.id}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Rating</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {TMDBService.formatRating(movie.vote_average)}/10
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Nguồn phát</p>
                  <p className="mt-1 text-sm font-semibold text-white">Admin / Cloudflare R2</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to={`/movie/${movie.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
                >
                  Xem thông tin phim
                </Link>
                <Link
                  to="/admin/content"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/15"
                >
                  <Settings className="h-4 w-4" />
                  Quản lý trong Admin
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
