import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, RefreshCw } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCurrentUser } from '../hooks/useAuth';
import TMDBService from '../services/tmdb.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';

function getWatchlistPosterUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return TMDBService.getTMDBFallbackImage('poster');
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return TMDBService.getTMDBImageUrl(pathOrUrl, 'w500', 'poster');
}

const WatchlistPage: React.FC = () => {
  const { user } = useCurrentUser();
  const { movies, loading, error, removeFromWatchlist, refreshWatchlist } = useWatchlist();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white/5 p-4 text-gray-300">
              <Heart className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-white">Danh sách của tôi</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Đăng nhập để xem danh sách phim yêu thích và quay lại nhanh những bộ phim bạn đã lưu.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-white/10 bg-gray-950/80 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <LoadingSpinner />
              <div>
                <h1 className="text-2xl font-bold text-white">Đang tải danh sách yêu thích</h1>
                <p className="mt-2 text-sm text-gray-400">Thêm Phim đang lấy lại những bộ phim bạn đã lưu.</p>
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
              <Heart className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">Không thể tải danh sách yêu thích</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">{error}</p>
            <button
              type="button"
              onClick={() => refreshWatchlist()}
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

  if (!movies || movies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 pb-16 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white/5 p-4 text-gray-300">
              <Heart className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-white">Danh sách yêu thích đang trống</h1>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Hãy thêm phim vào danh sách để quay lại nhanh khi bạn muốn xem tiếp.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Khám phá phim
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-16 pt-24">
      <div className="container mx-auto px-4 md:px-8 lg:px-16">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Danh sách của tôi</h1>
          <p className="text-gray-400">{movies.length} phim trong danh sách yêu thích</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie) => (
            <div key={movie.catalogId ?? movie.id} className="group relative">
              <MovieCard
                id={movie.id}
                internalMovieId={movie.catalogId ?? null}
                title={movie.title}
                image={getWatchlistPosterUrl(movie.poster_path)}
                quality={movie.hasPlaySource ? 'HD' : 'Info'}
                type={movie.hasPlaySource ? 'Xem được' : 'Chi tiết'}
                rating={movie.vote_average}
                year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                overview={movie.overview}
                analytics={{
                  sourcePage: '/watchlist',
                  sourceModule: 'watchlist',
                }}
              />

              <button
                onClick={async (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  await removeFromWatchlist(movie.id);
                }}
                className="absolute right-2 top-2 z-20 rounded-full bg-red-600 p-2 text-white opacity-0 transition hover:bg-red-700 group-hover:opacity-100"
                title="Xóa khỏi danh sách"
              >
                <Heart className="h-4 w-4 fill-white" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
