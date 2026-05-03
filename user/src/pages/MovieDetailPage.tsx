import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Play,
  Plus,
  Star,
} from 'lucide-react';
import { useMovieDetails } from '../hooks/useTMDB';
import { useAuth } from '../hooks/useAuth';
import { useWatchlist } from '../hooks/useWatchlist';
import TMDBService from '../services/tmdb.service';
import CatalogService, { type CatalogMovie, type SimilarMovie } from '../services/catalog.service';
import * as SupabaseService from '../services/supabase.service';
import MovieCard from '../components/movie/MovieCard';
import MovieGrid from '../components/movie/MovieGrid';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SectionTitle from '../components/ui/SectionTitle';
import type { TMDBMovieDetail } from '../types/tmdb.types';
import { USE_TMDB } from '../config/featureFlags';

const ratingOptions = Array.from({ length: 10 }, (_, index) => index + 1);

function getCatalogImageUrl(
  pathOrUrl: string | null | undefined,
  size: 'w500' | 'w1280',
  kind: 'poster' | 'backdrop'
) {
  if (!pathOrUrl) return TMDBService.getTMDBFallbackImage(kind);
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return TMDBService.getTMDBImageUrl(pathOrUrl, size, kind);
}

function catalogToMovieDetail(movie: CatalogMovie): TMDBMovieDetail {
  const releaseDate = movie.release_date || (movie.release_year ? `${movie.release_year}-01-01` : '');

  return {
    id: movie.tmdb_id || movie.id,
    title: movie.title,
    original_title: movie.original_title || movie.title,
    overview: movie.overview || '',
    poster_path: movie.poster_url || movie.poster_path,
    backdrop_path: movie.backdrop_url || movie.backdrop_path || movie.poster_url || movie.poster_path,
    release_date: releaseDate,
    genre_ids: [],
    adult: false,
    original_language: 'vi',
    popularity: 0,
    vote_average: movie.vote_average || 0,
    vote_count: movie.vote_count || 0,
    video: false,
    genres: [],
    runtime: movie.runtime_minutes || 0,
    status: movie.status || 'active',
    tagline: '',
    production_countries: [],
    production_companies: [],
    imdb_id: '',
    homepage: '',
    budget: 0,
    revenue: 0,
  };
}

function formatSimilarReasonTag(tag: string) {
  switch (tag) {
    case 'same_genre':
      return 'Cùng thể loại';
    case 'same_language':
      return 'Cùng ngôn ngữ';
    case 'same_country':
      return 'Cùng quốc gia';
    case 'same_type':
      return 'Cùng dạng phim';
    case 'close_release_year':
      return 'Năm phát hành gần';
    case 'similar_runtime':
      return 'Thời lượng gần';
    case 'same_age_rating':
      return 'Cùng mức phân loại';
    case 'metadata_overlap':
      return 'Nội dung gần giống';
    case 'behavior_overlap':
      return 'Gu xem gần nhau';
    case 'well_rated':
      return 'Đánh giá tốt';
    case 'trending':
      return 'Đang nổi bật';
    case 'featured':
      return 'Được đề xuất';
    case 'playable':
      return 'Xem được ngay';
    default:
      return tag.replace(/_/g, ' ');
  }
}

const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const routeMovieId = Number(id || 0);
  const navigate = useNavigate();
  const location = useLocation();
  const isInternalMovieRoute = location.pathname.startsWith('/movie/id/');

  const {
    movie: tmdbMovie,
    loading: tmdbLoading,
    error: tmdbError,
  } = useMovieDetails(!isInternalMovieRoute && routeMovieId && USE_TMDB ? routeMovieId : null);
  const { user } = useAuth();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState('');
  const [internalInWatchlist, setInternalInWatchlist] = useState(false);
  const [catalogMovie, setCatalogMovie] = useState<CatalogMovie | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(isInternalMovieRoute);
  const [similarMovies, setSimilarMovies] = useState<SimilarMovie[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingError, setRatingError] = useState('');

  const useCatalogResolvedMovie = isInternalMovieRoute || !USE_TMDB;
  const movie = useCatalogResolvedMovie ? (catalogMovie ? catalogToMovieDetail(catalogMovie) : tmdbMovie) : tmdbMovie;
  const loading = useCatalogResolvedMovie ? sourceLoading : tmdbLoading;
  const error = useCatalogResolvedMovie ? catalogError : tmdbError;
  const preferInternalWatchlistState = isInternalMovieRoute || !USE_TMDB;
  const inWatchlist = preferInternalWatchlistState ? internalInWatchlist : movie ? isInWatchlist(movie.id) : false;

  useEffect(() => {
    let isMounted = true;

    const loadCatalogMovie = async () => {
      if (!routeMovieId) {
        setCatalogMovie(null);
        setCatalogError(null);
        setSourceLoading(false);
        return;
      }

      setSourceLoading(true);
      setCatalogError(null);

      const { movie: nextMovie, error: nextError } = isInternalMovieRoute
        ? await CatalogService.getMovieByInternalId(routeMovieId)
        : tmdbMovie && user?.id
          ? await CatalogService.ensureMovieFromTMDB(tmdbMovie)
          : await CatalogService.getMovieByTmdbId(routeMovieId);

      if (isMounted) {
        setCatalogMovie(nextMovie);
        setCatalogError(nextError || null);
        setSourceLoading(false);
      }
    };

    void loadCatalogMovie();

    return () => {
      isMounted = false;
    };
  }, [routeMovieId, isInternalMovieRoute, tmdbMovie, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadUserRating = async () => {
      if (!user?.id || !catalogMovie?.id) {
        setUserRating(null);
        return;
      }

      const rating = await SupabaseService.getUserRating(user.id, catalogMovie.id);

      if (isMounted) {
        setUserRating(rating?.rating ?? null);
      }
    };

    void loadUserRating();

    return () => {
      isMounted = false;
    };
  }, [user?.id, catalogMovie?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadInternalWatchlist = async () => {
      if (!(user?.id && catalogMovie?.id && (isInternalMovieRoute || !USE_TMDB))) {
        if (isMounted) setInternalInWatchlist(false);
        return;
      }

      const isSaved = await SupabaseService.isInWatchlist(user.id, catalogMovie.id);
      if (isMounted) setInternalInWatchlist(isSaved);
    };

    void loadInternalWatchlist();

    return () => {
      isMounted = false;
    };
  }, [isInternalMovieRoute, user?.id, catalogMovie?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadSimilarMovies = async () => {
      if (sourceLoading) return;

      if (!catalogMovie?.id) {
        if (isMounted) {
          setSimilarMovies([]);
          setSimilarError(null);
          setSimilarLoading(false);
        }
        return;
      }

      setSimilarLoading(true);
      setSimilarError(null);

      const { items, error: nextError } = await CatalogService.getSimilarMoviesByInternalId(catalogMovie.id, 6);

      if (!isMounted) return;

      setSimilarMovies(items.filter((item) => item.id !== catalogMovie.id));
      setSimilarError(nextError || null);
      setSimilarLoading(false);
    };

    void loadSimilarMovies();

    return () => {
      isMounted = false;
    };
  }, [catalogMovie?.id, sourceLoading]);

  const isCatalogMovieActive = catalogMovie?.is_active !== false && catalogMovie?.status !== 'hidden';
  const hasPlaySource = Boolean(catalogMovie?.has_play_source && isCatalogMovieActive);
  const sourceStatusText = sourceLoading
    ? 'Đang kiểm tra nguồn phát...'
    : catalogMovie && !isCatalogMovieActive
      ? 'Phim này hiện chưa được mở xem.'
      : hasPlaySource
        ? 'Phim này đã sẵn sàng để xem.'
        : 'Phim này chưa có nguồn phát, vui lòng quay lại sau.';

  const watchButtonLabel = !user
    ? 'Đăng nhập để xem'
    : !isCatalogMovieActive
      ? 'Tạm chưa mở xem'
      : !hasPlaySource
        ? 'Chưa có nguồn phát'
        : 'Xem ngay';
  const watchButtonDisabled = !isCatalogMovieActive || !hasPlaySource;

  const handleWatchAction = () => {
    navigate(isInternalMovieRoute ? `/watch/id/${routeMovieId}` : `/watch/${routeMovieId}`);
  };

  const handlePrimaryWatchAction = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (watchButtonDisabled) return;
    handleWatchAction();
  };

  const handleRateMovie = async (rating: number) => {
    setRatingMessage('');
    setRatingError('');

    if (!user?.id) {
      setRatingError('Vui lòng đăng nhập để đánh giá phim.');
      return;
    }

    setRatingLoading(true);

    try {
      let targetMovie = catalogMovie;

      if (!targetMovie?.id && !isInternalMovieRoute && movie) {
        const { movie: ensuredMovie, error: ensureError } = await CatalogService.ensureMovieFromTMDB(movie);
        targetMovie = ensuredMovie;

        if (ensuredMovie) {
          setCatalogMovie(ensuredMovie);
        }

        if (!targetMovie?.id) {
          throw new Error(ensureError || 'Không thể chuẩn bị dữ liệu phim để đánh giá.');
        }
      }

      if (!targetMovie?.id) {
        throw new Error('Không thể chuẩn bị dữ liệu phim để đánh giá.');
      }

      const result = await SupabaseService.addRating(user.id, targetMovie.id, rating);

      if (!result.success) {
        throw new Error(result.error || 'Không thể lưu đánh giá.');
      }

      setUserRating(rating);
      setRatingMessage('Đã lưu đánh giá của bạn.');
    } catch (nextError) {
      setRatingError(nextError instanceof Error ? nextError.message : 'Không thể lưu đánh giá.');
    } finally {
      setRatingLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    setWatchlistError('');

    if (!user?.id) {
      setWatchlistError('Vui lòng đăng nhập để lưu phim vào danh sách.');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!movie) {
      setWatchlistError('Không tìm thấy dữ liệu phim để lưu.');
      return;
    }

    setWatchlistLoading(true);
    try {
      if (catalogMovie?.id && (isInternalMovieRoute || !USE_TMDB)) {
        const result = await SupabaseService.addToWatchlist(user.id, catalogMovie.id);
        if (!result.success) {
          throw new Error(result.error || 'Không thể thêm phim vào danh sách.');
        }

        setInternalInWatchlist(true);
        return;
      }

      const result = await addToWatchlist(movie);
      if (!result.success) {
        throw new Error(result.error || 'Không thể thêm phim vào danh sách.');
      }
    } catch (error) {
      setWatchlistError(error instanceof Error ? error.message : 'Không thể thêm phim vào danh sách.');
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    setWatchlistError('');

    if (!user?.id) {
      setWatchlistError('Vui lòng đăng nhập để cập nhật danh sách.');
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!movie) {
      setWatchlistError('Không tìm thấy dữ liệu phim để cập nhật.');
      return;
    }

    setWatchlistLoading(true);
    try {
      if (catalogMovie?.id && (isInternalMovieRoute || !USE_TMDB)) {
        const result = await SupabaseService.removeFromWatchlist(user.id, catalogMovie.id);
        if (!result.success) {
          throw new Error(result.error || 'Không thể xóa phim khỏi danh sách.');
        }

        setInternalInWatchlist(false);
        return;
      }

      const result = await removeFromWatchlist(movie);
      if (!result.success) {
        throw new Error(result.error || 'Không thể xóa phim khỏi danh sách.');
      }
    } catch (error) {
      setWatchlistError(error instanceof Error ? error.message : 'Không thể xóa phim khỏi danh sách.');
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4">
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-gray-800 bg-gray-900/80 p-10 text-center shadow-2xl">
            <LoadingSpinner text="Đang tải chi tiết phim..." />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-950 px-4">
        <div className="container mx-auto flex min-h-[70vh] items-center justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-red-500/20 bg-gray-900/80 p-10 text-center shadow-2xl">
            <h1 className="mb-4 text-3xl font-bold text-white">
              {error ? 'Không thể tải phim' : 'Không tìm thấy phim'}
            </h1>
            <p className="mb-8 text-gray-400">
              {error && error instanceof Error
                ? error.message
                : 'Phim này có thể đã bị xóa hoặc không còn khả dụng.'}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                <ArrowLeft className="h-5 w-5" />
                Về trang chủ
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 font-semibold text-white transition hover:border-gray-500 hover:bg-gray-800"
              >
                Tìm phim khác
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const backdropUrl = getCatalogImageUrl(movie.backdrop_path || movie.poster_path, 'w1280', 'backdrop');
  const posterUrl = getCatalogImageUrl(movie.poster_path, 'w500', 'poster');
  const canLoadSimilarMovies = Boolean(catalogMovie?.id);
  const similarEmptyMessage = canLoadSimilarMovies
    ? 'Chưa có phim tương tự phù hợp để gợi ý ngay lúc này.'
    : 'Phim này chưa resolve được movie.id nội bộ nên chưa thể lấy danh sách tương tự.';

  return (
    <div className="min-h-screen bg-gray-950">
      <section className="relative min-h-[78vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backdropUrl})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/82 to-gray-950/30" />

        <div className="relative container mx-auto px-4 pb-14 pt-10 md:px-8 lg:px-16">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-medium text-gray-200 backdrop-blur transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>

          <div className="grid items-end gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
            <div className="mx-auto w-full max-w-[320px] lg:mx-0">
              <img
                src={posterUrl}
                alt={movie.title}
                className="aspect-[2/3] w-full rounded-3xl border border-white/10 object-cover shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
                onError={(event) => {
                  event.currentTarget.src = TMDBService.getTMDBFallbackImage('poster');
                }}
              />
            </div>

            <div className="max-w-4xl">
              <h1 className="mb-5 text-4xl font-black leading-tight text-white drop-shadow-2xl md:text-6xl">
                {movie.title}
              </h1>

              <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                {movie.release_date && (
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1">
                    {new Date(movie.release_date).getFullYear()}
                  </span>
                )}
                {Number(movie.runtime) > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1">
                    <Clock className="h-4 w-4" />
                    {TMDBService.formatRuntime(movie.runtime)}
                  </span>
                )}
                {movie.vote_average > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-yellow-200">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {TMDBService.formatRating(movie.vote_average)}/10
                  </span>
                )}
              </div>

              {movie.genres?.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/genre/${genre.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-200 transition hover:border-orange-500/30 hover:text-orange-300"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mb-8 max-w-3xl">
                <h2 className="mb-3 text-xl font-bold text-white md:text-2xl">Tóm tắt nội dung</h2>
                <p className="leading-8 text-gray-300">
                  {movie.overview || 'Phim hiện chưa có mô tả chi tiết.'}
                </p>
              </div>

              <div className="max-w-3xl space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300">
                  {sourceStatusText}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">Đánh giá phim</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        {user
                          ? 'Chọn điểm 1-10 để chia sẻ cảm nhận của bạn về bộ phim.'
                          : 'Bạn cần đăng nhập để đánh giá phim.'}
                      </p>
                    </div>
                    {userRating && (
                      <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-200">
                        Bạn đã chấm {userRating}/10
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ratingOptions.map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRateMovie(rating)}
                        disabled={ratingLoading}
                        className={`h-10 w-10 rounded-xl border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          userRating === rating
                            ? 'border-yellow-400 bg-yellow-400 text-black'
                            : 'border-white/10 bg-white/5 text-gray-200 hover:border-yellow-400/60 hover:text-yellow-200'
                        }`}
                        aria-label={`Chấm ${rating} điểm`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  {ratingMessage && <p className="mt-3 text-sm text-emerald-300">{ratingMessage}</p>}
                  {ratingError && <p className="mt-3 text-sm text-red-300">{ratingError}</p>}
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handlePrimaryWatchAction}
                    disabled={watchButtonDisabled}
                    className={`inline-flex items-center gap-3 rounded-2xl px-7 py-4 text-base font-bold text-white shadow-lg transition ${
                      watchButtonDisabled
                        ? 'cursor-not-allowed bg-gray-700 text-gray-300'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <Play className="h-5 w-5 fill-white" />
                    {watchButtonLabel}
                  </button>

                  {!user ? (
                    <button
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/90 px-7 py-4 text-base font-bold text-white transition hover:border-gray-500 hover:bg-gray-800"
                    >
                      <Plus className="h-5 w-5" />
                      Đăng nhập để lưu
                    </button>
                  ) : inWatchlist ? (
                    <button
                      onClick={handleRemoveFromWatchlist}
                      disabled={watchlistLoading}
                      className="inline-flex items-center gap-3 rounded-2xl bg-emerald-600 px-7 py-4 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {watchlistLoading ? <LoadingSpinner size="sm" text="" /> : <Check className="h-5 w-5" />}
                      Đã thêm vào danh sách
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToWatchlist}
                      disabled={watchlistLoading}
                      className="inline-flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/90 px-7 py-4 text-base font-bold text-white transition hover:border-gray-500 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {watchlistLoading ? <LoadingSpinner size="sm" text="" /> : <Plus className="h-5 w-5" />}
                      Thêm vào danh sách
                    </button>
                  )}
                </div>

                {watchlistError && <p className="text-sm text-red-300">{watchlistError}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16 md:px-8 lg:px-16">
        <div className="rounded-[2rem] border border-white/10 bg-gray-900/50 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:p-8">
          <SectionTitle
            title="Phim gần giống"
            description="Các phim nội bộ đang hoạt động và có thể xem ngay, được chọn theo mức độ tương tự với phim hiện tại."
          />

          {similarLoading ? (
            <div className="flex justify-center rounded-3xl border border-white/10 bg-black/20 py-12">
              <LoadingSpinner text="Đang tải phim tương tự..." />
            </div>
          ) : similarMovies.length > 0 ? (
            <MovieGrid>
              {similarMovies.map((similarMovie) => {
                const reasonLabels = similarMovie.reason_tags.slice(0, 3).map(formatSimilarReasonTag);
                const similarityPercent = Math.max(1, Math.round(similarMovie.similarity_score * 100));

                return (
                  <MovieCard
                    key={similarMovie.id}
                    id={similarMovie.id}
                    internalMovieId={similarMovie.id}
                    href={`/movie/id/${similarMovie.id}`}
                    title={similarMovie.title}
                    image={getCatalogImageUrl(similarMovie.poster_url || similarMovie.poster_path, 'w500', 'poster')}
                    quality={`${similarityPercent}%`}
                    type={reasonLabels[0] || 'Tương tự'}
                    overview={reasonLabels.join(' · ')}
                    showProgress={false}
                  />
                );
              })}
            </MovieGrid>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center">
              <p className="text-base font-semibold text-white">Chưa có phim tương tự</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {similarError || similarEmptyMessage}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MovieDetailPage;
