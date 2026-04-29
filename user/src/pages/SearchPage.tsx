import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clapperboard, Search as SearchIcon, Sparkles } from 'lucide-react';
import { useMovieSearch } from '../hooks/useTMDB';
import TMDBService from '../services/tmdb.service';
import CatalogService from '../services/catalog.service';
import { requestAiMovieRecommendations, type AiRecommendationMovie } from '../services/ai-chat.service';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MovieCard from '../components/movie/MovieCard';
import SearchBar from '../components/ui/SearchBar';
import { logSearchAnalytics } from '../services/analytics.service';

function sanitizeQuery(query: string): string {
  return query.replace(/[<>]/g, '').trim().slice(0, 100);
}

const quickSuggestions = ['Avatar', 'Spider-Man', 'Harry Potter', 'Fast & Furious'];
const quickAiPrompts = [
  'Phim hành động hài nhẹ nhàng',
  'Phim tình cảm buồn nhưng đẹp',
  'Phim kinh dị Hàn Quốc',
  'Phim giống Spider-Man',
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawQuery = searchParams.get('q') || '';
  const query = sanitizeQuery(rawQuery);
  const [page, setPage] = useState(1);
  const [aiQuery, setAiQuery] = useState('');
  const [lastAiSearch, setLastAiSearch] = useState('');
  const [aiMovies, setAiMovies] = useState<AiRecommendationMovie[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiWarning, setAiWarning] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [internalMovieIdsByTmdb, setInternalMovieIdsByTmdb] = useState<Record<number, number>>({});
  const lastLoggedSearchKey = useRef('');

  const { movies, loading, error, data } = useMovieSearch(query, true, page);
  const totalResults = data?.total_results || 0;
  const totalPages = data?.total_pages || 1;
  const showingCount = movies.length;
  const movieIds = useMemo(() => movies.map((movie) => movie.id), [movies]);
  const movieIdsKey = useMemo(() => movieIds.join(','), [movieIds]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    let active = true;

    const loadInternalMappings = async () => {
      if (!query || movieIds.length === 0) {
        if (active) {
          setInternalMovieIdsByTmdb((prev) => (Object.keys(prev).length === 0 ? prev : {}));
        }
        return;
      }

      const { movies: internalMovies } = await CatalogService.getAvailableMoviesByTmdbIds(movieIds);
      if (!active) return;

      const nextMappings = internalMovies.reduce<Record<number, number>>((acc, movie) => {
        if (typeof movie.tmdb_id === 'number' && Number.isInteger(movie.id) && movie.id > 0) {
          acc[movie.tmdb_id] = movie.id;
        }
        return acc;
      }, {});

      setInternalMovieIdsByTmdb((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextMappings);

        if (prevKeys.length === nextKeys.length && prevKeys.every((key) => prev[Number(key)] === nextMappings[Number(key)])) {
          return prev;
        }

        return nextMappings;
      });
    };

    void loadInternalMappings();

    return () => {
      active = false;
    };
  }, [movieIdsKey, query]);

  useEffect(() => {
    if (!query || loading || error || page !== 1) return;

    const logKey = `${query}::${totalResults}`;
    if (lastLoggedSearchKey.current === logKey) return;

    lastLoggedSearchKey.current = logKey;
    logSearchAnalytics({
      query,
      normalized_query: query.toLowerCase(),
      source_page: '/search',
      filters_json: { page: 1, source: 'tmdb_search' },
      result_count: totalResults,
    });
  }, [error, loading, page, query, totalResults]);

  const resultSummary = useMemo(() => {
    if (!query) return 'Tìm theo tên phim để khám phá nhanh nội dung bạn muốn xem.';
    if (loading) return `Thêm Phim đang tìm kết quả phù hợp với từ khóa "${query}".`;
    if (error) return 'Không thể lấy dữ liệu tìm kiếm lúc này. Bạn có thể thử lại sau ít phút.';
    if (movies.length === 0) return `Chưa tìm thấy nội dung phù hợp với "${query}".`;
    return `Hiển thị ${showingCount} phim trên trang ${page}, tổng cộng ${totalResults.toLocaleString()} kết quả.`;
  }, [error, loading, movies.length, page, query, showingCount, totalResults]);

  const handleSearch = (nextQuery: string) => {
    navigate(`/search?q=${encodeURIComponent(sanitizeQuery(nextQuery))}`);
  };

  const handleAiRecommend = async (event?: React.FormEvent, prompt?: string) => {
    event?.preventDefault();

    const nextQuery = sanitizeQuery(prompt || aiQuery);
    if (!nextQuery) {
      setAiError('Bạn hãy nhập gu phim hoặc tâm trạng muốn xem.');
      return;
    }

    setAiQuery(nextQuery);
    setLastAiSearch(nextQuery);
    setAiLoading(true);
    setAiError('');
    setAiWarning('');
    setAiExplanation('');
    setAiSource('');

    try {
      const result = await requestAiMovieRecommendations({
        query: nextQuery,
        topN: 10,
      });

      setAiMovies(result.movies);
      setAiWarning(result.warning);
      setAiExplanation(result.explanation);
      setAiSource(result.source || 'chat');
    } catch (nextError) {
      setAiMovies([]);
      setAiExplanation('');
      setAiError(nextError instanceof Error ? nextError.message : 'Không thể lấy gợi ý lúc này.');
    } finally {
      setAiLoading(false);
    }
  };

  const getAiPosterUrl = (movie: AiRecommendationMovie) => {
    if (movie.poster_url?.startsWith('http')) return movie.poster_url;
    if (movie.poster_path?.startsWith('http')) return movie.poster_path;
    if (movie.poster_url) return TMDBService.getTMDBImageUrl(movie.poster_url, 'w500', 'poster');
    return TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster');
  };

  const getAiMovieHref = (movie: AiRecommendationMovie) => {
    const internalMovieId =
      typeof movie.internal_movie_id === 'number' && movie.internal_movie_id > 0
        ? movie.internal_movie_id
        : typeof movie.movie_id === 'number' && movie.movie_id > 0
          ? movie.movie_id
          : null;

    if (internalMovieId) {
      return `/movie/id/${internalMovieId}`;
    }

    if (typeof movie.tmdb_id === 'number' && movie.tmdb_id > 0) {
      return `/movie/${movie.tmdb_id}`;
    }

    return '/search';
  };

  const getAiCardLabel = (movie: AiRecommendationMovie) => {
    return movie.action_type === 'watch_now' ? 'Xem ngay' : 'Xem chi tiết';
  };

  const getAiSourceLabel = () => {
    switch (aiSource) {
      case 'hybrid':
        return 'Kết hợp thư viện nội bộ và TMDB';
      case 'chat':
        return 'Đang dùng AI recommendation';
      case 'chat_behavior':
        return 'Đang dùng AI + hành vi người dùng';
      case 'fallback':
        return 'Đang dùng gợi ý fallback';
      default:
        return 'Nhập gu phim để bắt đầu';
    }
  };

  const renderAiRecommendations = () => (
    <section className="rounded-[2rem] border border-orange-500/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
            <Sparkles className="h-4 w-4" />
            AI gợi ý phim
          </div>
          <h2 className="text-2xl font-bold text-white md:text-3xl">Chat với AI để tìm phim hợp gu</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Mô tả tâm trạng, thể loại hoặc kiểu phim bạn muốn xem. AI sẽ ưu tiên phim trong hệ thống trước, sau đó mới bổ sung thêm từ TMDB nếu cần.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
          {getAiSourceLabel()}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-gray-950/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-gray-200">
              Bạn muốn xem phim kiểu gì? Hãy nói ngắn gọn, ví dụ: phim buồn đẹp, phim Hàn Quốc, phim giống Spider-Man...
            </div>
          </div>

          {lastAiSearch && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-orange-600 px-4 py-3 text-sm font-medium text-white shadow-[0_16px_40px_rgba(234,88,12,0.28)]">
                {lastAiSearch}
              </div>
            </div>
          )}

          {aiLoading ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex min-h-20 flex-1 items-center rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                <LoadingSpinner />
                <span className="ml-3">AI đang phân tích yêu cầu và chuẩn bị danh sách gợi ý...</span>
              </div>
            </div>
          ) : aiError ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-300">
                <Clapperboard className="h-5 w-5" />
              </div>
              <div className="rounded-3xl rounded-tl-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-100">
                {aiError}
              </div>
            </div>
          ) : aiExplanation ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-gray-200">
                {aiExplanation}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-gray-300">
                Dựa trên sở thích và hoạt động gần đây của bạn, tôi sẽ gợi ý danh sách phù hợp và ưu tiên phim có thể xem ngay.
              </div>
            </div>
          )}

          {aiWarning && (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm leading-7 text-yellow-100">
              {aiWarning}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
          <form onSubmit={handleAiRecommend} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                Tin nhắn của bạn
              </label>
              <textarea
                value={aiQuery}
                onChange={(event) => setAiQuery(event.target.value)}
                placeholder="Ví dụ: phim tình cảm buồn, phim Hàn Quốc hay, phim giống Naruto..."
                rows={5}
                className="w-full resize-none rounded-3xl border border-white/10 bg-gray-950 px-5 py-4 text-white outline-none transition placeholder:text-gray-500 focus:border-orange-500/60"
              />
            </div>

            <button
              type="submit"
              disabled={aiLoading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {aiLoading ? 'Đang gợi ý...' : 'Gửi cho AI'}
            </button>
          </form>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Prompt mẫu</p>
            <div className="flex flex-wrap gap-3">
              {quickAiPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAiRecommend(undefined, prompt)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-300 transition hover:border-orange-500/40 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {aiMovies.length > 0 && !aiLoading && (
        <div className="mt-8">
          <p className="mb-4 text-sm text-gray-400">
            Gợi ý AI cho: <span className="font-semibold text-white">{lastAiSearch}</span>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {aiMovies.map((movie, index) => (
              <MovieCard
                key={`${movie.movie_id ?? 'tmdb'}-${movie.tmdb_id ?? index}`}
                id={movie.movie_id ?? movie.tmdb_id ?? index}
                internalMovieId={movie.internal_movie_id ?? movie.movie_id}
                href={getAiMovieHref(movie)}
                title={movie.title}
                image={getAiPosterUrl(movie)}
                quality={aiSource === 'fallback' ? `#${index + 1}` : 'AI'}
                type={getAiCardLabel(movie)}
                rating={movie.average_rating}
                year={movie.release_year ? String(movie.release_year) : ''}
                overview={
                  movie.reason ||
                  movie.reason_tags?.slice(0, 3).join(' · ') ||
                  'Gợi ý phù hợp với lựa chọn của bạn.'
                }
                showProgress={false}
                analytics={{
                  sourcePage: '/search',
                  sourceModule: 'ai_chat_recommendations',
                  queryText: lastAiSearch,
                  recommendationSource: aiSource || 'ai',
                  rankPosition: index + 1,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!aiLoading && lastAiSearch && !aiError && aiMovies.length === 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-gray-950/70 p-5 text-sm leading-7 text-gray-300">
          Không tìm thấy gợi ý AI phù hợp cho <span className="font-semibold text-white">{lastAiSearch}</span>.
          Hãy thử mô tả ngắn gọn hơn hoặc đổi sang tên phim, thể loại, quốc gia.
        </div>
      )}
    </section>
  );

  const renderEmptyQueryState = () => (
    <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 inline-flex rounded-2xl bg-orange-500/10 p-4 text-orange-400">
          <SearchIcon className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">Tìm kiếm phim</h1>
        <p className="mt-3 text-sm leading-7 text-gray-400 md:text-base">{resultSummary}</p>

        <div className="mt-8">
          <SearchBar onSearch={handleSearch} initialQuery={query} className="max-w-3xl" />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {quickSuggestions.map((keyword) => (
            <button
              key={keyword}
              type="button"
              onClick={() => handleSearch(keyword)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-300 transition hover:border-orange-500/40 hover:text-white"
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResultsState = () => (
    <>
      <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
              <Sparkles className="h-4 w-4" />
              Khám phá theo từ khóa
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Kết quả cho <span className="text-orange-400">"{query}"</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">{resultSummary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Từ khóa</p>
              <p className="mt-1 text-sm font-semibold text-white">{query}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Kết quả</p>
              <p className="mt-1 text-sm font-semibold text-white">{totalResults.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Trang hiện tại</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {page} / {Math.max(totalPages, 1)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SearchBar onSearch={handleSearch} initialQuery={query} className="max-w-3xl" />
        </div>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-white/10 bg-gray-950/70 p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <LoadingSpinner />
            <div>
              <p className="text-lg font-semibold text-white">Đang tìm kiếm phim</p>
              <p className="mt-2 text-sm text-gray-400">Thêm Phim đang tải danh sách phù hợp với từ khóa của bạn.</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-500/20 bg-gray-950/80 p-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-red-500/10 p-4 text-red-400">
            <Clapperboard className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Không thể tải kết quả tìm kiếm</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">{error.message || 'Đã xảy ra lỗi không xác định.'}</p>
          <button
            type="button"
            onClick={() => handleSearch(query)}
            className="mt-6 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Tải lại
          </button>
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-gray-950/80 p-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-white/5 p-4 text-gray-300">
            <SearchIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-white">Không tìm thấy kết quả phù hợp</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">
            Hãy thử từ khóa ngắn hơn, tên tiếng Anh, hoặc một bộ phim nổi tiếng khác.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {quickSuggestions.slice(0, 3).map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => handleSearch(keyword)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-300 transition hover:border-orange-500/40 hover:text-white"
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {movies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                internalMovieId={internalMovieIdsByTmdb[movie.id] ?? null}
                title={movie.title}
                image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                quality={movie.vote_average >= 7 ? '4K' : 'HD'}
                type="Phim lẻ"
                rating={movie.vote_average}
                year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                overview={movie.overview}
                analytics={{
                  sourcePage: '/search',
                  sourceModule: 'search_results',
                  queryText: query,
                  rankPosition: (page - 1) * movies.length + index + 1,
                }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-gray-950/80 px-5 py-5 md:flex-row">
              <div>
                <p className="text-sm font-medium text-white">Phân trang kết quả</p>
                <p className="mt-1 text-sm text-gray-400">
                  Trang {page} / {totalPages} · {totalResults.toLocaleString()} kết quả
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trang trước
                </button>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white">
                  {page}
                </div>

                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trang sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-950 pb-16 pt-24">
      <div className="container mx-auto space-y-8 px-4 md:px-8 lg:px-16">
        {renderAiRecommendations()}
        {!query ? renderEmptyQueryState() : renderResultsState()}
      </div>
    </div>
  );
};

export default SearchPage;
