import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import Slider from '../components/ui/Slider';
import SectionTitle from '../components/ui/SectionTitle';
import MovieGrid from '../components/movie/MovieGrid';
import MovieCard from '../components/movie/MovieCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TMDBService from '../services/tmdb.service';
import { usePopularMovies, useTrendingMovies, useNowPlayingMovies } from '../hooks/useTMDB';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useAuth } from '../hooks/useAuth';
import type { SlideData } from '../data/mockData';

const HomePage: React.FC = () => {
  // Fetch data từ TMDB
  const { movies: popularMovies, loading: popularLoading } = usePopularMovies(1);
  const { movies: trendingMovies, loading: trendingLoading } = useTrendingMovies('week', 1);
  const { movies: nowPlayingMovies, loading: nowPlayingLoading } = useNowPlayingMovies(1);

  // Watch history for continue watching section
  const { user } = useAuth();
  const { continueWatching, loading: historyLoading } = useWatchHistory();

  const [featuredSlides, setFeaturedSlides] = useState<SlideData[]>([]);

  // Convert TMDB movies to slider format
  useEffect(() => {
    if (popularMovies.length > 0) {
      const slides = popularMovies.slice(0, 4).map((movie) => ({
        id: movie.id,
        title: movie.title,
        description: movie.overview || 'Không có mô tả',
        image: TMDBService.getTMDBImageUrl(movie.backdrop_path, 'original'),
        rating: TMDBService.formatRating(movie.vote_average),
        year: new Date(movie.release_date).getFullYear(),
      }));
      setFeaturedSlides(slides);
    }
  }, [popularMovies]);

  const handleViewAll = (section: string) => {
    console.log(`View all clicked for: ${section}`);
    // TODO: Navigate to category page
  };

  // Show loading spinner while fetching
  if (popularLoading && trendingLoading && nowPlayingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {/* Hero Slider Section - Full Width */}
      {featuredSlides.length > 0 && (
        <section className="-mt-16 pt-16">
          <Slider slides={featuredSlides} autoPlay={true} interval={5000} />
        </section>
      )}

      {/* Main Content Container */}
      <div className="px-4 md:px-8 lg:px-16 space-y-16 pb-16 -mt-16">

        {/* Continue Watching Section - Only show if user is logged in and has history */}
        {user && continueWatching.length > 0 && (
          <section>
            <SectionTitle title="Tiếp tục xem" showViewAll={false} />
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {continueWatching.slice(0, 5).map((movie) => (
                  <div key={movie.id} className="relative group">
                    <Link to={`/watch/${movie.id}`} className="block">
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                          <div
                            className="h-full bg-red-600"
                            style={{ width: `${movie.progress}%` }}
                          />
                        </div>
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-white ml-1" fill="white" />
                          </div>
                        </div>
                      </div>
                      <h3 className="mt-2 text-white text-sm font-medium line-clamp-1 group-hover:text-red-500 transition">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-gray-400">{movie.progress}% đã xem</p>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Phim Đang Chiếu Rạp Section */}
        <section>
          <SectionTitle
            title="Phim Đang Chiếu Rạp"
            showViewAll={true}
            onViewAllClick={() => handleViewAll('now-playing')}
          />
          {nowPlayingLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <MovieGrid>
              {nowPlayingMovies.slice(0, 8).map((movie) => (
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
            </MovieGrid>
          )}
        </section>

        {/* Phim Hot Trong Tuần Section */}
        <section>
          <SectionTitle
            title="Phim Hot Trong Tuần"
            showViewAll={true}
            onViewAllClick={() => handleViewAll('trending')}
          />
          {trendingLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <MovieGrid>
              {trendingMovies.slice(0, 8).map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
                  quality="4K"
                  type="Phim lẻ"
                  rating={movie.vote_average}
                  year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                  overview={movie.overview}
                />
              ))}
            </MovieGrid>
          )}
        </section>

        {/* Phim Phổ Biến Section */}
        <section>
          <SectionTitle
            title="Phim Phổ Biến"
            showViewAll={true}
            onViewAllClick={() => handleViewAll('popular')}
          />
          {popularLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <MovieGrid>
              {popularMovies.slice(4, 12).map((movie) => (
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
            </MovieGrid>
          )}
        </section>

        {/* Banner Quảng Cáo - Netflix Style */}
        <section className="relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-orange-900/90 to-red-900/90" />
          <div className="relative px-8 py-12 md:py-16 text-center">
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
              Trải Nghiệm Xem Phim Không Giới Hạn
            </h3>
            <p className="text-lg md:text-xl mb-8 text-gray-100 max-w-2xl mx-auto">
              Hàng nghìn bộ phim HD, 4K chất lượng cao từ TMDB đang chờ bạn khám phá
            </p>
            <button className="bg-white text-red-600 px-10 py-4 rounded font-bold text-lg hover:bg-gray-100 transition transform hover:scale-105">
              Khám Phá Ngay
            </button>
          </div>
        </section>

      </div>
    </>
  );
};

export default HomePage;
