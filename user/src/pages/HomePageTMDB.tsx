import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Flame, Sparkles, Star } from 'lucide-react';
import Slider from '../components/ui/Slider';
import SectionTitle from '../components/ui/SectionTitle';
import MovieGrid from '../components/movie/MovieGrid';
import MovieCard from '../components/movie/MovieCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TMDBService from '../services/tmdb.service';
import * as SupabaseService from '../services/supabase.service';
import { usePopularMovies, useTopRatedMovies, useTrendingMovies } from '../hooks/useTMDB';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useAuth } from '../hooks/useAuth';
import CatalogService, { type CatalogMovie, type MovieRanking, type SimilarMovie } from '../services/catalog.service';
import { getApiBaseUrl } from '../services/api';
import { supabase } from '../lib/supabase';
import type { SlideData } from '../data/mockData';
import { USE_TMDB } from '../config/featureFlags';
import { formatRecommendationReasonSentence, formatRecommendationReasonText } from '../utils/recommendationReason';

type HomeRecommendation = {
  movieId: number | null;
  tmdbId: number | null;
  href: string;
  title: string;
  posterPath: string | null;
  posterUrl: string | null;
  rating: number;
  overview: string;
  rankingScore: number;
  availability?: 'internal' | 'tmdb_only';
  actionType?: 'watch_now' | 'view_detail';
};

type PersonalizedRecommendationMovie = {
  movie_id: number | null;
  internal_movie_id?: number | null;
  tmdb_id: number | null;
  title: string;
  poster_path: string | null;
  poster_url: string | null;
  release_year: number | null;
  average_rating: number;
  score: number;
  reason: string;
  reason_tags?: string[];
  availability?: 'internal' | 'tmdb_only';
  action_type?: 'watch_now' | 'view_detail';
};

const API_BASE_URL = getApiBaseUrl();

function buildMovieHref(movieId: number | null, tmdbId: number | null) {
  if (typeof movieId === 'number' && Number.isFinite(movieId) && movieId > 0) {
    return `/movie/id/${movieId}`;
  }

  if (typeof tmdbId === 'number' && Number.isFinite(tmdbId) && tmdbId > 0) {
    return `/movie/${tmdbId}`;
  }

  return '/search';
}

function buildContinueWatchingHref(movie: {
  internalMovieId?: number | null;
  tmdbId?: number | null;
  episodeId?: number | null;
  id: number;
}) {
  const basePath =
    typeof movie.internalMovieId === 'number' && movie.internalMovieId > 0
      ? `/watch/id/${movie.internalMovieId}`
      : typeof movie.tmdbId === 'number' && movie.tmdbId > 0
        ? `/watch/${movie.tmdbId}`
        : `/watch/${movie.id}`;

  return movie.episodeId ? `${basePath}?episodeId=${movie.episodeId}` : basePath;
}

function areTmdbMappingsEqual(
  current: Record<number, number>,
  next: Record<number, number>
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => current[Number(key)] === next[Number(key)]);
}

function getContinueWatchingImage(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return TMDBService.getTMDBFallbackImage('poster');
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return pathOrUrl;
  return TMDBService.getTMDBImageUrl(pathOrUrl, 'w500', 'poster');
}

function resolvePosterImage(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return TMDBService.getTMDBFallbackImage('poster');
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return pathOrUrl;
  return TMDBService.getTMDBImageUrl(pathOrUrl, 'w500', 'poster');
}

function catalogMovieToSlide(movie: CatalogMovie): SlideData {
  return {
    id: movie.tmdb_id ?? movie.id,
    title: movie.title,
    description: movie.overview || 'Khám phá phim trong thư viện nội bộ của Thêm Phim.',
    image: TMDBService.getTMDBImageUrl(movie.backdrop_url || movie.backdrop_path || movie.poster_url || movie.poster_path, 'w1280', 'backdrop'),
    rating: movie.vote_average || 0,
    year: movie.release_year || undefined,
  };
}

function rankingToRecommendation(movie: MovieRanking): HomeRecommendation | null {
  const movieId = typeof movie.movie_id === 'number' ? movie.movie_id : null;
  const tmdbId = typeof movie.tmdb_id === 'number' ? movie.tmdb_id : null;

  if (!movieId && !tmdbId) return null;

  return {
    movieId,
    tmdbId,
    href: buildMovieHref(movieId, tmdbId),
    title: movie.title,
    posterPath: movie.poster_path,
    posterUrl: movie.poster_url,
    rating: movie.average_rating,
    overview: `Lượt xem: ${movie.view_count} · Yêu thích: ${movie.favorite_count} · Điểm nổi bật: ${movie.ranking_score.toFixed(1)}`,
    rankingScore: movie.ranking_score,
  };
}

function similarMovieToRecommendation(movie: SimilarMovie): HomeRecommendation | null {
  const movieId = typeof movie.id === 'number' ? movie.id : null;
  const tmdbId = typeof movie.tmdb_id === 'number' ? movie.tmdb_id : null;

  if (!movieId && !tmdbId) return null;

  return {
    movieId,
    tmdbId,
    href: buildMovieHref(movieId, tmdbId),
    title: movie.title,
    posterPath: movie.poster_path,
    posterUrl: movie.poster_url,
    rating: 0,
    overview: formatRecommendationReasonSentence(movie.reason_tags, 'Phim tương tự với nội dung bạn vừa xem.'),
    rankingScore: movie.similarity_score,
  };
}

function getHighRatingThreshold(values: Array<{ rating: number }>) {
  const maxRating = values.reduce((current, item) => Math.max(current, Number(item.rating) || 0), 0);
  return maxRating > 5 ? 8 : 4;
}

function getRatingSortTime(value: { updated_at?: string; created_at?: string }) {
  const timestamp = Date.parse(value.updated_at || value.created_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function apiToRecommendation(movie: PersonalizedRecommendationMovie): HomeRecommendation | null {
  const movieId =
    typeof movie.internal_movie_id === 'number' && movie.internal_movie_id > 0
      ? movie.internal_movie_id
      : typeof movie.movie_id === 'number'
        ? movie.movie_id
        : null;
  const tmdbId = typeof movie.tmdb_id === 'number' ? movie.tmdb_id : null;

  if (!movieId && !tmdbId) return null;

  return {
    movieId,
    tmdbId,
    href: buildMovieHref(movieId, tmdbId),
    title: movie.title,
    posterPath: movie.poster_path,
    posterUrl: movie.poster_url,
    rating: movie.average_rating || 0,
    overview: formatRecommendationReasonText(movie.reason, movie.reason_tags, 'Gợi ý dựa trên hành vi xem phim của bạn.'),
    rankingScore: movie.score || 0,
  };
}

const HomePageTMDB: React.FC = () => {
  const { user } = useAuth();
  const [movieRankings, setMovieRankings] = useState<MovieRanking[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [internalCatalogMovies, setInternalCatalogMovies] = useState<CatalogMovie[]>([]);
  const [internalCatalogLoading, setInternalCatalogLoading] = useState(true);
  const [internalCatalogError, setInternalCatalogError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<HomeRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationsPersonalized, setRecommendationsPersonalized] = useState(false);
  const [recommendationsSummary, setRecommendationsSummary] = useState<string | null>(null);
  const [becauseYouWatched, setBecauseYouWatched] = useState<HomeRecommendation[]>([]);
  const [becauseYouWatchedSeedTitle, setBecauseYouWatchedSeedTitle] = useState<string | null>(null);
  const [becauseYouWatchedLoading, setBecauseYouWatchedLoading] = useState(false);
  const [becauseYouWatchedError, setBecauseYouWatchedError] = useState<string | null>(null);
  const [favoritesRecommendations, setFavoritesRecommendations] = useState<HomeRecommendation[]>([]);
  const [favoritesSeedTitle, setFavoritesSeedTitle] = useState<string | null>(null);
  const [favoritesRecommendationsLoading, setFavoritesRecommendationsLoading] = useState(false);
  const [favoritesRecommendationsError, setFavoritesRecommendationsError] = useState<string | null>(null);
  const [ratingsRecommendations, setRatingsRecommendations] = useState<HomeRecommendation[]>([]);
  const [ratingsSeedTitle, setRatingsSeedTitle] = useState<string | null>(null);
  const [ratingsRecommendationsLoading, setRatingsRecommendationsLoading] = useState(false);
  const [posterByInternalMovieId, setPosterByInternalMovieId] = useState<Record<number, string>>({});
  const [internalMovieIdsByTmdb, setInternalMovieIdsByTmdb] = useState<Record<number, number>>({});
  const {
    movies: trendingMovies,
    loading: trendingLoading,
    error: trendingError,
  } = useTrendingMovies('week', 1);
  const {
    movies: popularMovies,
    loading: popularLoading,
    error: popularError,
  } = usePopularMovies(1);
  const {
    movies: topRatedMovies,
    loading: topRatedLoading,
    error: topRatedError,
  } = useTopRatedMovies(1);
  const { historyItems, continueWatching, loading: historyLoading, error: historyError } = useWatchHistory();

  const watchedEnoughMovieIds = useMemo(
    () =>
      new Set(
        historyItems
          .filter((movie) => movie.progressPercent >= 90 && movie.internalMovieId > 0)
          .map((movie) => movie.internalMovieId)
      ),
    [historyItems]
  );

  const becauseYouWatchedSeed = useMemo(
    () => continueWatching.find((movie) => movie.internalMovieId > 0) || null,
    [continueWatching]
  );

  const visibleTmdbIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...continueWatching
            .slice(0, 6)
            .map((movie) => movie.tmdbId)
            .filter((movieId): movieId is number => movieId !== null && Number.isInteger(movieId) && movieId > 0),
          ...popularMovies.slice(0, 12).map((movie) => movie.id),
          ...topRatedMovies.slice(0, 12).map((movie) => movie.id),
        ])
      ).filter((movieId) => Number.isInteger(movieId) && movieId > 0),
    [continueWatching, popularMovies, topRatedMovies]
  );

  const recommendationMoviesNeedingPoster = useMemo(
    () =>
      [
        ...recommendations,
        ...becauseYouWatched,
        ...favoritesRecommendations,
        ...ratingsRecommendations,
      ]
        .map((movie) => movie.movieId)
        .filter((movieId): movieId is number => typeof movieId === 'number' && movieId > 0),
    [becauseYouWatched, favoritesRecommendations, ratingsRecommendations, recommendations]
  );

  useEffect(() => {
    let isMounted = true;

    const loadInternalCatalog = async () => {
      setInternalCatalogLoading(true);
      const { movies, error } = await CatalogService.getAvailableMovies(12);

      if (isMounted) {
        setInternalCatalogMovies(movies);
        setInternalCatalogError(error || null);
        setInternalCatalogLoading(false);
      }
    };

    void loadInternalCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRankings = async () => {
      setRankingsLoading(true);
      const { rankings, error } = await CatalogService.getMovieRankings(12);

      if (isMounted) {
        setMovieRankings(rankings);
        setRankingsError(error || null);
        setRankingsLoading(false);
      }
    };

    void loadRankings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFallbackRecommendations = async () => {
      const { rankings, error } = await CatalogService.getMovieRankings(10);
      const rankingRecommendations = rankings
        .map(rankingToRecommendation)
        .filter((movie): movie is HomeRecommendation => movie !== null)
        .slice(0, 10);

      return {
        recommendations: rankingRecommendations,
        error: error || null,
        personalized: false,
        summary: 'Bạn chưa có nhiều hoạt động, nên Thêm Phim đang hiển thị các phim nổi bật trước.',
      };
    };

    const loadRecommendations = async () => {
      setRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }

        const response = await fetch(`${API_BASE_URL}/api/ai/movie-recommendations/personalized`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ top_n: 10 }),
        });

        const responseText = await response.text();
        let payload: any = {};

        try {
          payload = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error('Backend trả về dữ liệu gợi ý không hợp lệ. Hãy restart backend rồi thử lại.');
        }

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Không thể tải gợi ý cho bạn lúc này.');
        }

        const nextRecommendations = (payload.movies || [])
          .map((movie: PersonalizedRecommendationMovie) => apiToRecommendation(movie))
          .filter((movie: HomeRecommendation | null): movie is HomeRecommendation => movie !== null)
          .slice(0, 10);

        if (nextRecommendations.length === 0) {
          const fallback = await loadFallbackRecommendations();

          if (isMounted) {
            setRecommendations(fallback.recommendations);
            setRecommendationsError(payload.warning || fallback.error || null);
            setRecommendationsPersonalized(false);
            setRecommendationsSummary(payload.summary || fallback.summary);
          }
          return;
        }

        if (isMounted) {
          setRecommendations(nextRecommendations);
          setRecommendationsError(payload.warning || null);
          setRecommendationsPersonalized(Boolean(payload.personalized));
          setRecommendationsSummary(payload.summary || null);
        }
      } catch (error) {
        const fallback = await loadFallbackRecommendations();

        if (isMounted) {
          setRecommendations(fallback.recommendations);
          setRecommendationsError(error instanceof Error ? error.message : fallback.error || null);
          setRecommendationsPersonalized(false);
          setRecommendationsSummary(fallback.summary);
        }
      } finally {
        if (isMounted) {
          setRecommendationsLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendationPosters = async () => {
      const movieIds = Array.from(new Set(recommendationMoviesNeedingPoster));

      if (movieIds.length === 0) {
        if (isMounted) {
          setPosterByInternalMovieId({});
        }
        return;
      }

      const movieResults = await Promise.all(
        movieIds.map((movieId) => CatalogService.getMovieByInternalId(movieId))
      );
      if (!isMounted) return;

      const nextPosterMap = movieResults.reduce<Record<number, string>>((acc, result, index) => {
        const movie = result.movie;
        const fallbackMovieId = movieIds[index];
        const poster = movie ? resolvePosterImage(movie.poster_url || movie.poster_path) : null;

        if (fallbackMovieId > 0 && poster) {
          acc[fallbackMovieId] = poster;
        }
        return acc;
      }, {});

      setPosterByInternalMovieId(nextPosterMap);
    };

    void loadRecommendationPosters();

    return () => {
      isMounted = false;
    };
  }, [recommendationMoviesNeedingPoster]);

  useEffect(() => {
    let isMounted = true;

    const loadBecauseYouWatched = async () => {
      if (!user || !becauseYouWatchedSeed?.internalMovieId) {
        if (isMounted) {
          setBecauseYouWatched([]);
          setBecauseYouWatchedSeedTitle(null);
          setBecauseYouWatchedError(null);
          setBecauseYouWatchedLoading(false);
        }
        return;
      }

      setBecauseYouWatchedLoading(true);
      setBecauseYouWatchedError(null);

      try {
        const result = await CatalogService.getSimilarMoviesByInternalId(becauseYouWatchedSeed.internalMovieId, 8);
        const items = result.items
          .filter((movie) => movie.id !== becauseYouWatchedSeed.internalMovieId)
          .filter((movie) => !watchedEnoughMovieIds.has(movie.id))
          .map((movie) => similarMovieToRecommendation(movie))
          .filter((movie): movie is HomeRecommendation => movie !== null)
          .slice(0, 6);

        if (!isMounted) return;

        setBecauseYouWatched(items);
        setBecauseYouWatchedSeedTitle(becauseYouWatchedSeed.title);
        setBecauseYouWatchedError(result.error || null);
      } catch (error) {
        if (!isMounted) return;
        setBecauseYouWatched([]);
        setBecauseYouWatchedSeedTitle(becauseYouWatchedSeed.title);
        setBecauseYouWatchedError(error instanceof Error ? error.message : 'Khong the tai goi y tuong tu luc nay.');
      } finally {
        if (isMounted) {
          setBecauseYouWatchedLoading(false);
        }
      }
    };

    void loadBecauseYouWatched();

    return () => {
      isMounted = false;
    };
  }, [becauseYouWatchedSeed, user, watchedEnoughMovieIds]);

  useEffect(() => {
    let isMounted = true;

    const loadFavoriteRecommendations = async () => {
      if (!user) {
        if (isMounted) {
          setFavoritesRecommendations([]);
          setFavoritesSeedTitle(null);
          setFavoritesRecommendationsError(null);
          setFavoritesRecommendationsLoading(false);
        }
        return;
      }

      setFavoritesRecommendationsLoading(true);
      setFavoritesRecommendationsError(null);

      try {
        const { movieIds, error } = await SupabaseService.getWatchlist(user.id);

        if (error) {
          throw new Error(error);
        }

        if (!movieIds.length) {
          if (isMounted) {
            setFavoritesRecommendations([]);
            setFavoritesSeedTitle(null);
          }
          return;
        }

        const favoriteCatalogMovies = await CatalogService.getMoviesByInternalIds(movieIds.slice(0, 12));
        const movieById = new Map(favoriteCatalogMovies.map((movie) => [movie.id, movie]));
        const seedMovie = movieIds
          .map((movieId) => movieById.get(movieId))
          .find((movie) => movie && movie.is_active !== false);

        if (!seedMovie) {
          if (isMounted) {
            setFavoritesRecommendations([]);
            setFavoritesSeedTitle(null);
          }
          return;
        }

        const result = await CatalogService.getSimilarMoviesByInternalId(seedMovie.id, 8);
        const items = result.items
          .filter((movie) => movie.id !== seedMovie.id)
          .filter((movie) => !watchedEnoughMovieIds.has(movie.id))
          .map((movie) => similarMovieToRecommendation(movie))
          .filter((movie): movie is HomeRecommendation => movie !== null)
          .slice(0, 6);

        if (!isMounted) return;

        setFavoritesRecommendations(items);
        setFavoritesSeedTitle(items.length > 0 ? seedMovie.title : null);
        setFavoritesRecommendationsError(result.error || null);
      } catch (error) {
        if (!isMounted) return;
        setFavoritesRecommendations([]);
        setFavoritesSeedTitle(null);
        setFavoritesRecommendationsError(error instanceof Error ? error.message : 'Khong the tai goi y tu favorite luc nay.');
      } finally {
        if (isMounted) {
          setFavoritesRecommendationsLoading(false);
        }
      }
    };

    void loadFavoriteRecommendations();

    return () => {
      isMounted = false;
    };
  }, [user, watchedEnoughMovieIds]);

  useEffect(() => {
    let isMounted = true;

    const loadRatingRecommendations = async () => {
      if (!user) {
        if (isMounted) {
          setRatingsRecommendations([]);
          setRatingsSeedTitle(null);
          setRatingsRecommendationsLoading(false);
        }
        return;
      }

      setRatingsRecommendationsLoading(true);

      try {
        const { ratings, error } = await SupabaseService.getUserRatings(user.id, 20);

        if (error) {
          throw new Error(error);
        }

        if (!ratings.length) {
          if (isMounted) {
            setRatingsRecommendations([]);
            setRatingsSeedTitle(null);
          }
          return;
        }

        const highRatingThreshold = getHighRatingThreshold(ratings);
        const highRatings = ratings
          .filter((item) => Number(item.rating) >= highRatingThreshold)
          .sort((a, b) => {
            const ratingDiff = Number(b.rating) - Number(a.rating);
            if (ratingDiff !== 0) return ratingDiff;
            return getRatingSortTime(b) - getRatingSortTime(a);
          });

        if (!highRatings.length) {
          if (isMounted) {
            setRatingsRecommendations([]);
            setRatingsSeedTitle(null);
          }
          return;
        }

        const ratingMovieIds = Array.from(new Set(highRatings.map((item) => item.movie_id))).slice(0, 12);
        const ratedCatalogMovies = await CatalogService.getMoviesByInternalIds(ratingMovieIds);
        const movieById = new Map(ratedCatalogMovies.map((movie) => [movie.id, movie]));
        const seedMovie = highRatings
          .map((item) => movieById.get(item.movie_id))
          .find((movie) => movie && movie.is_active !== false);

        if (!seedMovie) {
          if (isMounted) {
            setRatingsRecommendations([]);
            setRatingsSeedTitle(null);
          }
          return;
        }

        const result = await CatalogService.getSimilarMoviesByInternalId(seedMovie.id, 8);
        const items = result.items
          .filter((movie) => movie.id !== seedMovie.id)
          .filter((movie) => !watchedEnoughMovieIds.has(movie.id))
          .map((movie) => similarMovieToRecommendation(movie))
          .filter((movie): movie is HomeRecommendation => movie !== null)
          .slice(0, 6);

        if (!isMounted) return;

        setRatingsRecommendations(items);
        setRatingsSeedTitle(items.length > 0 ? seedMovie.title : null);
      } catch (_error) {
        if (!isMounted) return;
        setRatingsRecommendations([]);
        setRatingsSeedTitle(null);
      } finally {
        if (isMounted) {
          setRatingsRecommendationsLoading(false);
        }
      }
    };

    void loadRatingRecommendations();

    return () => {
      isMounted = false;
    };
  }, [user, watchedEnoughMovieIds]);

  useEffect(() => {
    let isMounted = true;

    const loadInternalMovieMappings = async () => {
      if (visibleTmdbIds.length === 0) {
        if (isMounted) {
          setInternalMovieIdsByTmdb((current) =>
            Object.keys(current).length === 0 ? current : {}
          );
        }
        return;
      }

      const { movies } = await CatalogService.getAvailableMoviesByTmdbIds(visibleTmdbIds);
      if (!isMounted) return;

      const nextMappings = movies.reduce<Record<number, number>>((acc, movie) => {
        if (typeof movie.tmdb_id === 'number' && Number.isInteger(movie.id) && movie.id > 0) {
          acc[movie.tmdb_id] = movie.id;
        }
        return acc;
      }, {});

      setInternalMovieIdsByTmdb((current) =>
        areTmdbMappingsEqual(current, nextMappings) ? current : nextMappings
      );
    };

    void loadInternalMovieMappings();

    return () => {
      isMounted = false;
    };
  }, [visibleTmdbIds]);

  const featuredSlides: SlideData[] = USE_TMDB
    ? trendingMovies.slice(0, 5).map((movie) => ({
        id: movie.id,
        title: movie.title,
        description: movie.overview || 'Khám phá thông tin phim, diễn viên và trailer mới nhất.',
        image: TMDBService.getTMDBImageUrl(movie.backdrop_path || movie.poster_path, 'w1280', 'backdrop'),
        rating: TMDBService.formatRating(movie.vote_average),
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      }))
    : internalCatalogMovies.slice(0, 5).map(catalogMovieToSlide);

  const pageLoading = USE_TMDB ? trendingLoading && popularLoading && topRatedLoading : false;
  const pageError = USE_TMDB ? trendingError || popularError || topRatedError : null;
  const recommendationBadgeLabel = recommendationsPersonalized
    ? 'Gợi ý từ AI theo lịch sử xem'
    : 'Danh sách thay thế từ thư viện nổi bật';

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      {featuredSlides.length > 0 && (
        <section className="-mt-16 pt-16">
          <Slider slides={featuredSlides} autoPlay interval={5000} />
        </section>
      )}

      <div className="-mt-20 space-y-20 px-4 pb-20 md:px-8 lg:px-16">
        <section className="relative z-10">
          <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-gray-950/85 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur md:grid-cols-3 md:p-6">
            <Link
              to="/search"
              className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-orange-500/30 hover:bg-white/[0.05]"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-orange-500/15 p-3 text-orange-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Khám phá kho phim</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                Tìm phim theo tên, thể loại, năm phát hành và những nội dung bạn đang quan tâm.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white transition group-hover:text-orange-300">
                Tìm phim <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              to="/search?q=action"
              className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-red-500/30 hover:bg-white/[0.05]"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-red-500/15 p-3 text-red-300">
                <Flame className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Phim đang nổi</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                Những bộ phim được quan tâm nhiều, dễ xem và phù hợp để bắt đầu ngay.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white transition group-hover:text-red-300">
                Xem hot <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <Link
              to={user ? '/history' : '/login'}
              className="group rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-sky-500/30 hover:bg-white/[0.05]"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-sky-500/15 p-3 text-sky-300">
                <Clock3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Tiến độ xem riêng</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                Lưu lại phim yêu thích, lịch sử xem và tiếp tục đúng đoạn bạn đã dừng.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white transition group-hover:text-sky-300">
                {user ? 'Lịch sử' : 'Đăng nhập'} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

        <section>
          <SectionTitle
            title="Mới thêm trong hệ thống"
            description="Các phim đã được thêm vào thư viện nội bộ và ưu tiên hiển thị ngay trên trang chủ."
            showViewAll={false}
          />

          {internalCatalogLoading ? (
            <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
              <LoadingSpinner />
            </div>
          ) : internalCatalogError ? (
            <div className="rounded-[2rem] border border-red-500/20 bg-gray-950 p-6 text-sm leading-6 text-gray-300">
              Chưa thể tải danh sách phim nội bộ lúc này: {internalCatalogError}
            </div>
          ) : internalCatalogMovies.length === 0 ? (
            <div className="rounded-[2rem] border border-gray-800 bg-gray-950 p-6 text-sm leading-6 text-gray-400">
              Chưa có phim nội bộ nào sẵn sàng hiển thị.
            </div>
          ) : (
            <MovieGrid>
              {internalCatalogMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.tmdb_id ?? movie.id}
                  internalMovieId={movie.id}
                  href={buildMovieHref(movie.id, movie.tmdb_id)}
                  title={movie.title}
                  image={movie.poster_url || TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                  quality={movie.has_play_source ? 'Nội bộ' : 'Sắp mở xem'}
                  type={movie.has_play_source ? 'Xem ngay' : 'Chi tiết'}
                  rating={movie.vote_average ?? 0}
                  year={movie.release_year ? String(movie.release_year) : ''}
                  overview={movie.overview || 'Phim được thêm trực tiếp từ thư viện nội bộ.'}
                  analytics={{
                    sourcePage: '/',
                    sourceModule: 'home_internal_catalog',
                  }}
                />
              ))}
            </MovieGrid>
          )}
        </section>

        {pageError && (
          <section className="rounded-[2rem] border border-red-500/20 bg-gray-950/85 p-6 text-sm leading-6 text-gray-300">
            Không thể tải một số nội dung lúc này: {pageError.message}
          </section>
        )}

        {user && becauseYouWatchedSeedTitle && (becauseYouWatchedLoading || becauseYouWatched.length > 0 || becauseYouWatchedError) ? (
          <section>
            <SectionTitle
              title={`Vì bạn đã xem ${becauseYouWatchedSeedTitle}`}
              description="Những phim nội bộ có nội dung hoặc chủ đề gần với bộ phim bạn đang theo dõi."
              showViewAll={false}
            />

            {becauseYouWatchedLoading ? (
              <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
                <LoadingSpinner />
              </div>
            ) : becauseYouWatched.length === 0 ? (
              becauseYouWatchedError ? (
                <div className="rounded-[2rem] border border-yellow-500/20 bg-gray-950 p-6 text-sm leading-6 text-gray-300">
                  Chua the tai goi y tuong tu luc nay: {becauseYouWatchedError}
                </div>
              ) : null
            ) : (
              <>
                {becauseYouWatchedError ? (
                  <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                    Mot so goi y tuong tu dang duoc hien thi tu cache san co: {becauseYouWatchedError}
                  </div>
                ) : null}
                <MovieGrid>
                  {becauseYouWatched.map((movie, index) => (
                    <MovieCard
                      key={`${movie.movieId ?? 'tmdb'}-${movie.tmdbId ?? index}`}
                      id={movie.movieId ?? movie.tmdbId ?? index}
                      internalMovieId={movie.movieId}
                      href={movie.href}
                      title={movie.title}
                      image={posterByInternalMovieId[movie.movieId ?? -1] || resolvePosterImage(movie.posterUrl || movie.posterPath)}
                      quality="Vi ban da xem"
                      type="Tuong tu"
                      rating={movie.rating}
                      overview={movie.overview}
                      showProgress={false}
                      analytics={{
                        sourcePage: '/',
                        sourceModule: 'home_because_you_watched',
                        recommendationSource: 'similar_internal',
                        rankPosition: index + 1,
                      }}
                    />
                  ))}
                </MovieGrid>
              </>
            )}
          </section>
        ) : null}

        {user && favoritesSeedTitle && (favoritesRecommendationsLoading || favoritesRecommendations.length > 0) ? (
          <section>
            <SectionTitle
              title="Dựa trên phim bạn yêu thích"
              description={`Gợi ý phim nội bộ có màu sắc gần với "${favoritesSeedTitle}" trong danh sách yêu thích của bạn.`}
              showViewAll={false}
            />

            {favoritesRecommendationsLoading ? (
              <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
                <LoadingSpinner />
              </div>
            ) : favoritesRecommendations.length > 0 ? (
              <>
                {favoritesRecommendationsError ? (
                  <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                    Mot so goi y tu favorite dang duoc hien thi tu du lieu san co: {favoritesRecommendationsError}
                  </div>
                ) : null}
                <MovieGrid>
                  {favoritesRecommendations.map((movie, index) => (
                    <MovieCard
                      key={`${movie.movieId ?? 'tmdb'}-${movie.tmdbId ?? index}`}
                      id={movie.movieId ?? movie.tmdbId ?? index}
                      internalMovieId={movie.movieId}
                      href={movie.href}
                      title={movie.title}
                      image={posterByInternalMovieId[movie.movieId ?? -1] || resolvePosterImage(movie.posterUrl || movie.posterPath)}
                      quality="Yeu thich"
                      type="Tuong tu"
                      rating={movie.rating}
                      overview={movie.overview}
                      showProgress={false}
                      analytics={{
                        sourcePage: '/',
                        sourceModule: 'home_based_on_favorites',
                        recommendationSource: 'favorite_similar_internal',
                        rankPosition: index + 1,
                      }}
                    />
                  ))}
                </MovieGrid>
              </>
            ) : null}
          </section>
        ) : null}

        {user && ratingsSeedTitle && (ratingsRecommendationsLoading || ratingsRecommendations.length > 0) ? (
          <section>
            <SectionTitle
              title="Dựa trên đánh giá của bạn"
              description={`Gợi ý từ những phim bạn đã chấm điểm cao, bắt đầu từ "${ratingsSeedTitle}".`}
              showViewAll={false}
            />

            {ratingsRecommendationsLoading ? (
              <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
                <LoadingSpinner />
              </div>
            ) : ratingsRecommendations.length > 0 ? (
              <MovieGrid>
                {ratingsRecommendations.map((movie, index) => (
                  <MovieCard
                    key={`${movie.movieId ?? 'tmdb'}-${movie.tmdbId ?? index}`}
                    id={movie.movieId ?? movie.tmdbId ?? index}
                    internalMovieId={movie.movieId}
                    href={movie.href}
                    title={movie.title}
                    image={posterByInternalMovieId[movie.movieId ?? -1] || resolvePosterImage(movie.posterUrl || movie.posterPath)}
                    quality="Danh gia cao"
                    type="Tuong tu"
                    rating={movie.rating}
                    overview={movie.overview}
                    showProgress={false}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: 'home_based_on_ratings',
                      recommendationSource: 'rating_similar_internal',
                      rankPosition: index + 1,
                    }}
                  />
                ))}
              </MovieGrid>
            ) : null}
          </section>
        ) : null}

        <section>
          <SectionTitle
            title="Gợi ý cho bạn"
            description={
              recommendationsSummary ||
              (recommendationsPersonalized
                ? 'Dựa trên phim bạn đã xem và yêu thích để chọn ra những nội dung hợp gu hơn.'
                : 'AI chưa có đủ dữ liệu cá nhân hóa nên Thêm Phim đang hiển thị các phim nổi bật trước.')
            }
            showViewAll={false}
          />

          {recommendationsLoading ? (
            <div className="rounded-[2rem] border border-gray-800 bg-gray-950/70 p-8">
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <LoadingSpinner />
                <div>
                  <p className="text-lg font-semibold text-white">AI đang chuẩn bị gợi ý cho bạn</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Thêm Phim đang tổng hợp lịch sử xem và các phim phù hợp từ thư viện hiện có.
                  </p>
                </div>
              </div>
            </div>
          ) : recommendationsError && recommendations.length === 0 ? (
            <div className="rounded-[2rem] border border-red-500/20 bg-gray-950 p-6 text-sm leading-6 text-gray-300">
              Chưa thể tải gợi ý từ AI lúc này: {recommendationsError}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-[2rem] border border-gray-800 bg-gray-950 p-6 text-sm leading-6 text-gray-400">
              AI chưa tìm được phim phù hợp lúc này. Hãy xem thêm vài bộ phim hoặc quay lại sau.
            </div>
          ) : (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                <Sparkles className="h-4 w-4" />
                {recommendationBadgeLabel}
              </div>

              {recommendationsError && (
                <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                  AI chưa phản hồi ổn định ở một phần dữ liệu, hệ thống đang hiển thị danh sách thay thế khả dụng.
                </div>
              )}

              <MovieGrid>
                {recommendations.map((movie, index) => (
                  <MovieCard
                    key={`${movie.movieId ?? 'tmdb'}-${movie.tmdbId ?? index}`}
                    id={movie.movieId ?? movie.tmdbId ?? index}
                    internalMovieId={movie.movieId}
                    href={movie.href}
                    title={movie.title}
                    image={posterByInternalMovieId[movie.movieId ?? -1] || resolvePosterImage(movie.posterUrl || movie.posterPath)}
                    quality={recommendationsPersonalized ? 'AI' : `#${index + 1}`}
                    type={recommendationsPersonalized ? 'Cho bạn' : 'Nổi bật'}
                    rating={movie.rating}
                    overview={movie.overview}
                    showProgress={false}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: recommendationsPersonalized ? 'home_personalized_recommendations' : 'home_fallback_recommendations',
                      recommendationSource: recommendationsPersonalized ? 'ai_personalized' : 'ranking_fallback',
                      rankPosition: index + 1,
                    }}
                  />
                ))}
              </MovieGrid>
            </>
          )}
        </section>

        {user && (
          <section>
            <SectionTitle
              title="Tiếp tục xem"
              description="Quay lại đúng những bộ phim bạn đang xem dở."
              showViewAll={false}
            />

            {historyLoading ? (
              <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
                <LoadingSpinner />
              </div>
            ) : historyError ? (
              <div className="rounded-[2rem] border border-red-500/20 bg-gray-950 p-6 text-sm leading-6 text-gray-300">
                Chưa thể tải tiến độ xem lúc này: {historyError}
              </div>
            ) : continueWatching.length === 0 ? (
              <div className="rounded-[2rem] border border-gray-800 bg-gray-950 p-6 text-sm leading-6 text-gray-400">
                Bạn chưa có phim đang xem dở.
              </div>
            ) : (
              <MovieGrid>
                {continueWatching.slice(0, 6).map((movie) => (
                  <MovieCard
                    key={movie.internalMovieId ?? movie.tmdbId ?? movie.id}
                    id={movie.tmdbId ?? movie.id}
                    internalMovieId={movie.internalMovieId ?? (movie.tmdbId ? internalMovieIdsByTmdb[movie.tmdbId] ?? null : null)}
                    title={movie.title}
                    image={getContinueWatchingImage(movie.poster_path)}
                    quality="HD"
                    type="Đang xem"
                    rating={movie.vote_average}
                    year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                    overview={movie.overview}
                    progressPercent={movie.progressPercent}
                    href={buildContinueWatchingHref(movie)}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: 'continue_watching',
                    }}
                  />
                ))}
              </MovieGrid>
            )}
          </section>
        )}

        <section>
          <SectionTitle
            title="Top phim trên Thêm Phim"
            description="Những bộ phim được xem, yêu thích và đánh giá cao trên Thêm Phim."
            showViewAll={false}
          />

          {rankingsLoading ? (
            <div className="flex justify-center rounded-[2rem] border border-gray-800 bg-gray-950/70 py-14">
              <LoadingSpinner />
            </div>
          ) : rankingsError ? (
            <div className="rounded-[2rem] border border-red-500/20 bg-gray-950 p-6 text-sm leading-6 text-gray-300">
              Chưa thể tải bảng xếp hạng lúc này: {rankingsError}
            </div>
          ) : movieRankings.length === 0 ? (
            <div className="rounded-[2rem] border border-gray-800 bg-gray-950 p-6 text-sm leading-6 text-gray-400">
              Chưa có dữ liệu xếp hạng. Hãy xem, yêu thích hoặc đánh giá phim để bảng này sôi động hơn.
            </div>
          ) : (
            <MovieGrid>
              {movieRankings
                .slice(0, 12)
                .map((movie, index) => (
                  <MovieCard
                    key={movie.movie_id}
                    id={movie.movie_id}
                    internalMovieId={movie.movie_id}
                    href={buildMovieHref(movie.movie_id, movie.tmdb_id)}
                    title={movie.title}
                    image={movie.poster_url || TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                    quality={`#${index + 1}`}
                    type={movie.tmdb_id ? 'Top phim' : 'Top nội bộ'}
                    rating={movie.average_rating}
                    overview={`Lượt xem: ${movie.view_count} · Yêu thích: ${movie.favorite_count} · Điểm nổi bật: ${movie.ranking_score.toFixed(1)}`}
                    showProgress={false}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: 'home_rankings',
                      recommendationSource: 'ranking_view',
                      rankPosition: index + 1,
                    }}
                  />
                ))}
            </MovieGrid>
          )}
        </section>

        {USE_TMDB && (
          <>
            <section>
              <SectionTitle title="Phim phổ biến" description="Những bộ phim đang được nhiều người quan tâm." showViewAll={false} />
              <MovieGrid>
                {popularMovies.slice(0, 12).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    internalMovieId={internalMovieIdsByTmdb[movie.id] ?? null}
                    title={movie.title}
                    image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                    quality={movie.vote_average >= 7 ? '4K' : 'HD'}
                    type="Phim"
                    rating={movie.vote_average}
                    year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                    overview={movie.overview}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: 'home_popular',
                    }}
                  />
                ))}
              </MovieGrid>
            </section>

            <section>
              <SectionTitle title="Được đánh giá cao" description="Các bộ phim có điểm đánh giá nổi bật để bạn tham khảo." showViewAll={false} />
              <MovieGrid>
                {topRatedMovies.slice(0, 12).map((movie) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    internalMovieId={internalMovieIdsByTmdb[movie.id] ?? null}
                    title={movie.title}
                    image={TMDBService.getTMDBImageUrl(movie.poster_path, 'w500', 'poster')}
                    quality="HD"
                    type="Đánh giá cao"
                    rating={movie.vote_average}
                    year={movie.release_date ? new Date(movie.release_date).getFullYear().toString() : ''}
                    overview={movie.overview}
                    analytics={{
                      sourcePage: '/',
                      sourceModule: 'home_top_rated',
                    }}
                  />
                ))}
              </MovieGrid>
            </section>
          </>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-gray-950 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-yellow-300">
                <Star className="h-4 w-4" />
                Thêm lựa chọn mỗi ngày
              </div>
              <h3 className="text-2xl font-bold text-white">Khám phá thêm phim hay</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Thêm Phim liên tục cập nhật thông tin, hình ảnh và gợi ý để bạn tìm được bộ phim hợp tâm trạng nhanh hơn.
              </p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Khám phá thêm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePageTMDB;
