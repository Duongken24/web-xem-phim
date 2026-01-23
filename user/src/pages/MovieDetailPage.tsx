import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Play, Plus, Check, ArrowLeft } from 'lucide-react';
import { useMovieDetails } from '../hooks/useTMDB';
import { useAuth } from '../hooks/useAuth';
import { useWatchlist } from '../hooks/useWatchlist';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovie } from '../types/tmdb.types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const movieId = parseInt(id || '0');
  const navigate = useNavigate();

  const { movie, credits, videos, loading, error } = useMovieDetails(movieId);
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const [similarMovies, setSimilarMovies] = useState<TMDBMovie[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const inWatchlist = isInWatchlist(movieId);

  // Fetch similar movies
  useEffect(() => {
    if (movieId) {
      TMDBService.getSimilarMovies(movieId, 1).then((response) => {
        setSimilarMovies(response.results.slice(0, 6));
      }).catch((err) => {
        console.error('Error fetching similar movies:', err);
      });
    }
  }, [movieId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            {error ? 'Lỗi khi tải phim' : 'Không tìm thấy phim'}
          </h1>
          <p className="text-gray-400 mb-6">
            {typeof error === 'string' ? error : error?.message || 'Phim này có thể đã bị xóa hoặc không tồn tại'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  // Get trailer
  const trailer = videos ? TMDBService.getTrailer(videos) : null;

  // Get director
  const director = credits ? TMDBService.getDirector(credits) : 'N/A';

  // Get main cast
  const cast = credits ? TMDBService.getMainCast(credits, 12) : [];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section with Backdrop */}
      <div className="relative w-full h-[70vh]">
        {/* Backdrop Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${TMDBService.getTMDBImageUrl(
              movie.backdrop_path || movie.poster_path,
              'original'
            )})`,
          }}
        >
          {/* Dark Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/50 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative h-full flex items-end">
          <div className="container mx-auto px-4 md:px-8 lg:px-16 pb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 drop-shadow-2xl">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="text-lg md:text-xl text-gray-300 italic drop-shadow-lg">
                &quot;{movie.tagline}&quot;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-8 lg:px-16 py-12">
        {/* Movie Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left: Poster */}
          <div className="lg:col-span-1">
            <img
              src={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
              alt={movie.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>

          {/* Right: Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rating & Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-lg">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-white font-bold">
                  {TMDBService.formatRating(movie.vote_average)}/10
                </span>
              </div>
              <span className="text-gray-400">
                {new Date(movie.release_date).getFullYear()}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">{TMDBService.formatRuntime(movie.runtime)}</span>
              {movie.adult && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    18+
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <Link
                  key={genre.id}
                  to={`/genre/${genre.id}`}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm transition"
                >
                  {genre.name}
                </Link>
              ))}
            </div>

            {/* Director */}
            <div>
              <span className="text-gray-400">Đạo diễn: </span>
              <span className="text-white font-semibold">{director}</span>
            </div>

            {/* Overview */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Tóm tắt</h2>
              <p className="text-gray-300 leading-relaxed">{movie.overview || 'Không có mô tả'}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => navigate(`/watch/${movieId}`)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold transition"
              >
                <Play className="w-5 h-5 fill-white" />
                Xem Ngay
              </button>

              {/* Watchlist Button */}
              {!user ? (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-bold transition"
                >
                  <Plus className="w-5 h-5" />
                  Đăng nhập để thêm
                </button>
              ) : inWatchlist ? (
                <button
                  onClick={async () => {
                    setWatchlistLoading(true);
                    await removeFromWatchlist(movieId);
                    setWatchlistLoading(false);
                  }}
                  disabled={watchlistLoading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {watchlistLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Đã thêm vào Danh sách
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setWatchlistLoading(true);
                    await addToWatchlist(movieId);
                    setWatchlistLoading(false);
                  }}
                  disabled={watchlistLoading}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {watchlistLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  Thêm vào Danh sách
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Trailer Section */}
        {trailer && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Trailer</h2>
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video rounded-lg overflow-hidden shadow-2xl">
                <iframe
                  src={trailer}
                  title="Movie Trailer"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Cast Section */}
        {cast.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Diễn viên</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cast.map((actor) => (
                <div key={actor.id} className="text-center">
                  <div className="mb-3 overflow-hidden rounded-lg aspect-[2/3] bg-gray-800">
                    {actor.profile_path ? (
                      <img
                        src={TMDBService.getTMDBImageUrl(actor.profile_path, 'w185')}
                        alt={actor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <span className="text-4xl">👤</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{actor.name}</h3>
                  <p className="text-gray-400 text-xs line-clamp-2">{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Movies Section */}
        {similarMovies.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Phim Tương Tự</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
                  quality="HD"
                  type="Phim lẻ"
                  rating={movie.vote_average}
                  year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                  overview={movie.overview}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetailPage;
