import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import VideoPlayer from '../components/movie/VideoPlayer';
import { useMovieDetails } from '../hooks/useTMDB';
import { useMovieProgress } from '../hooks/useWatchHistory';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movieId = parseInt(id || '0');

  const { user } = useAuth();
  const { movie, loading: movieLoading, error: movieError } = useMovieDetails(movieId);
  const { progress, loading: progressLoading, initialPosition, saveProgress, forceSaveProgress } = useMovieProgress(movieId);

  const [showInfo, setShowInfo] = useState(false);

  // Demo video URL (replace with actual video source)
  // In production, you would fetch this from your database or video CDN
  const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  // Handle progress updates (called every second by VideoPlayer)
  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    if (movie && user) {
      // Save progress periodically (useMovieProgress handles debouncing)
      const duration = movie.runtime ? movie.runtime * 60 : 0;
      saveProgress(state.playedSeconds, duration);
    }
  };

  // Handle video end
  const handleEnded = async () => {
    if (movie && user) {
      const duration = movie.runtime ? movie.runtime * 60 : 0;
      await forceSaveProgress(duration, duration); // Save 100% progress
    }
  };

  // Save progress when leaving the page
  useEffect(() => {
    return () => {
      // Note: This won't work reliably due to React cleanup timing
      // For better UX, consider using beforeunload event
    };
  }, []);

  if (movieLoading || progressLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Không thể tải phim</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showInfo ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-white hover:text-red-500 transition"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center space-x-4">
            <h1 className="text-white text-lg font-semibold hidden md:block">{movie.title}</h1>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-white hover:text-red-500 transition"
              title="Thông tin phim"
            >
              <Info className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Player - Full screen */}
      <div className="flex-1 w-full h-full">
        <VideoPlayer
          url={videoUrl}
          title={movie.title}
          initialProgress={initialPosition}
          onProgress={handleProgress}
          onEnded={handleEnded}
        />
      </div>

      {/* Movie Info Sidebar */}
      {showInfo && (
        <div className="absolute top-16 right-0 bottom-0 w-80 bg-gray-900/95 p-6 overflow-y-auto z-20">
          <button
            onClick={() => setShowInfo(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <div className="mt-4">
            <h2 className="text-xl font-bold text-white mb-2">{movie.title}</h2>

            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
              <span>{movie.release_date?.split('-')[0]}</span>
              {movie.runtime && (
                <>
                  <span>•</span>
                  <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                </>
              )}
              {movie.vote_average > 0 && (
                <>
                  <span>•</span>
                  <span className="text-yellow-500">★ {movie.vote_average.toFixed(1)}</span>
                </>
              )}
            </div>

            {progress && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                  <span>Tiến độ</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full h-1 bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-red-600 rounded-full"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-gray-300 text-sm mb-4">{movie.overview}</p>

            {movie.genres && movie.genres.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Thể loại</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              to={`/movie/${movie.id}`}
              className="block w-full text-center py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
            >
              Xem chi tiết phim
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchPage;
