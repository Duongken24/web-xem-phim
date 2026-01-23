import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMovieSearch } from '../hooks/useTMDB';
import TMDBService from '../services/tmdb.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [page, setPage] = useState(1);

  const { movies, loading, error, data } = useMovieSearch(query, true);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  // Empty query state
  if (!query) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-white mb-4">Tìm kiếm phim</h1>
            <p className="text-gray-400">
              Sử dụng thanh tìm kiếm ở trên để tìm phim yêu thích của bạn
            </p>
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
          <h1 className="text-3xl font-bold text-white mb-8">
            Đang tìm kiếm: <span className="text-red-500">{query}</span>
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
          <div className="text-center py-20">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Lỗi tìm kiếm</h1>
            <p className="text-gray-400">{error?.message || 'Đã xảy ra lỗi'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty results
  if (movies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-16">
          <h1 className="text-3xl font-bold text-white mb-8">
            Kết quả tìm kiếm: <span className="text-red-500">{query}</span>
          </h1>
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">Không tìm thấy kết quả nào</p>
            <p className="text-gray-500 mt-2">Hãy thử tìm kiếm với từ khóa khác</p>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Kết quả tìm kiếm: <span className="text-red-500">{query}</span>
          </h1>
          <p className="text-gray-400">
            Tìm thấy {data?.total_results || 0} kết quả
          </p>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-12">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500')}
              quality="HD"
              type="Phim"
              rating={movie.vote_average}
              year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
              overview={movie.overview}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              Trước
            </button>

            <span className="text-white font-semibold">
              Trang {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
