import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCurrentUser } from '../hooks/useAuth';
import TMDBService from '../services/tmdb.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';

const WatchlistPage: React.FC = () => {
  const { user } = useCurrentUser();
  const { movies, loading, error, removeFromWatchlist } = useWatchlist();

  // Debug logging
  useEffect(() => {
    console.log('WatchlistPage - User:', user);
    console.log('WatchlistPage - Movies:', movies);
    console.log('WatchlistPage - Loading:', loading);
    console.log('WatchlistPage - Error:', error);
  }, [user, movies, loading, error]);

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Danh Sách Của Tôi
          </h1>
          <div className="text-center py-20">
            <p className="text-xl text-gray-400 mb-4">Vui lòng đăng nhập để xem danh sách</p>
            <Link
              to="/login"
              className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Danh Sách Của Tôi
          </h1>
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Danh Sách Của Tôi
          </h1>
          <div className="text-center py-20">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition text-white font-semibold"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!movies || movies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Danh Sách Của Tôi
          </h1>
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
                  <Heart className="w-12 h-12 text-gray-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Danh sách trống
              </h2>
              <p className="text-gray-400 mb-6">
                Hãy thêm phim yêu thích vào danh sách để xem sau!
              </p>
              <Link
                to="/"
                className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Khám phá phim
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Danh Sách Của Tôi
          </h1>
          <p className="text-gray-400">
            {movies.length} phim trong danh sách
          </p>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="relative group">
              <MovieCard
                id={movie.id}
                title={movie.title}
                image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
                quality="HD"
                type="Phim"
                rating={movie.vote_average}
                year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                overview={movie.overview}
              />
              {/* Remove Button */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await removeFromWatchlist(movie.id);
                }}
                className="absolute top-2 right-2 z-20 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                title="Xóa khỏi danh sách"
              >
                <Heart className="w-4 h-4 fill-white" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;
