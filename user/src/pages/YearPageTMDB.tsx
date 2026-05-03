import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMoviesByYear } from '../hooks/useTMDB';
import TMDBService from '../services/tmdb.service';
import CatalogService from '../services/catalog.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';
import { USE_TMDB } from '../config/featureFlags';

const YearPageTMDB: React.FC = () => {
  const { year } = useParams<{ year: string }>();
  const releaseYear = Number(year || 0);
  const [page, setPage] = useState(1);
  const [internalMovieIdsByTmdb, setInternalMovieIdsByTmdb] = useState<Record<number, number>>({});
  const { movies, loading, error, data } = useMoviesByYear(releaseYear || null, page);
  const totalPages = data?.total_pages || 1;

  useEffect(() => {
    let active = true;

    const loadInternalMappings = async () => {
      if (!USE_TMDB) {
        if (active) setInternalMovieIdsByTmdb({});
        return;
      }

      if (movies.length === 0) {
        if (active) setInternalMovieIdsByTmdb({});
        return;
      }

      const { movies: internalMovies } = await CatalogService.getAvailableMoviesByTmdbIds(movies.map((movie) => movie.id));
      if (!active) return;

      const nextMappings = internalMovies.reduce<Record<number, number>>((acc, movie) => {
        if (typeof movie.tmdb_id === 'number' && Number.isInteger(movie.id) && movie.id > 0) {
          acc[movie.tmdb_id] = movie.id;
        }
        return acc;
      }, {});

      setInternalMovieIdsByTmdb(nextMappings);
    };

    void loadInternalMappings();

    return () => {
      active = false;
    };
  }, [movies]);

  if (!releaseYear) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 text-center text-white">
        Năm phát hành không hợp lệ.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="container mx-auto space-y-8 px-4 md:px-8 lg:px-16">
        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
            <CalendarDays className="h-4 w-4" />
            Khám phá theo năm
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Phim năm {releaseYear}</h1>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Danh sách phim được chọn theo năm phát hành để bạn dễ tìm nội dung muốn xem.
          </p>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-red-500/20 bg-gray-950/80 p-8 text-center text-red-200">
            {error.message}
          </div>
        ) : movies.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-gray-950/80 p-8 text-center text-gray-400">
            Không tìm thấy phim nào trong năm này.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {movies.map((movie, index) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  internalMovieId={USE_TMDB ? internalMovieIdsByTmdb[movie.id] ?? null : movie.id}
                  href={USE_TMDB ? undefined : `/movie/id/${movie.id}`}
                  title={movie.title}
                  image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                  quality={movie.vote_average >= 7 ? '4K' : 'HD'}
                  type={`${releaseYear}`}
                  rating={movie.vote_average}
                  year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                  overview={movie.overview}
                  analytics={{
                    sourcePage: `/year/${releaseYear}`,
                    sourceModule: 'year_results',
                    rankPosition: (page - 1) * movies.length + index + 1,
                  }}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <span className="text-sm font-semibold text-white">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default YearPageTMDB;
