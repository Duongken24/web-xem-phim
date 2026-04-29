import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import TMDBService from '../../services/tmdb.service';
import { getAnalyticsSessionId, logMovieClick } from '../../services/analytics.service';

interface MovieCardAnalytics {
  sourcePage?: string;
  sourceModule?: string;
  queryText?: string;
  recommendationSource?: string;
  rankPosition?: number;
  sessionId?: string | null;
}

interface MovieCardProps {
  id: number;
  internalMovieId?: number | null;
  title: string;
  image: string;
  quality: string;
  type: string;
  rating?: number;
  year?: string;
  overview?: string;
  progressPercent?: number;
  showProgress?: boolean;
  href?: string;
  analytics?: MovieCardAnalytics;
}

const MovieCard: React.FC<MovieCardProps> = ({
  id,
  internalMovieId,
  title,
  image,
  quality,
  type,
  rating,
  year,
  overview,
  progressPercent,
  showProgress = true,
  href,
  analytics,
}) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [imageSrc, setImageSrc] = useState(image || TMDBService.getTMDBFallbackImage('poster'));

  const handleImageError = () => {
    setImageSrc(TMDBService.getTMDBFallbackImage('poster'));
  };

  const handleCardClick = () => {
    if (!internalMovieId) return;

    logMovieClick({
      movie_id: internalMovieId,
      source_page: analytics?.sourcePage || location.pathname,
      source_module: analytics?.sourceModule,
      query_text: analytics?.queryText,
      recommendation_source: analytics?.recommendationSource,
      rank_position: analytics?.rankPosition,
      session_id: analytics?.sessionId || getAnalyticsSessionId(),
    });
  };

  return (
    <Link
      to={href || `/movie/${id}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/5 bg-gray-950/80 transition-all duration-300 hover:z-50 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
        <img
          src={imageSrc}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={handleImageError}
        />

        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg">
          {quality}
        </div>

        <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
          {type}
        </div>

        <div
          className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h3 className="mb-2 line-clamp-2 text-sm font-bold text-white drop-shadow-lg">{title}</h3>

          <div className="mb-2 flex items-center gap-2 text-xs text-gray-300">
            {rating !== undefined && rating > 0 && (
              <span className="flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5">
                <Star className="mr-1 h-3 w-3 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold text-yellow-500">{rating.toFixed(1)}</span>
              </span>
            )}
            {year && (
              <>
                {rating !== undefined && rating > 0 && <span className="text-gray-500">•</span>}
                <span className="rounded-full bg-white/10 px-2 py-0.5">{year}</span>
              </>
            )}
          </div>

          {overview && <p className="mb-4 line-clamp-3 text-xs leading-5 text-gray-300">{overview}</p>}

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">Xem chi tiết</span>
            <div className="rounded-full bg-red-600 p-2 transition-colors group-hover:bg-red-500">
              <Play className="h-5 w-5 fill-white text-white" />
            </div>
          </div>
        </div>

        {showProgress && typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/65">
            <div
              className="h-full rounded-r-full bg-red-600"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      <div className={`space-y-1.5 px-3 py-3 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <h3 className="line-clamp-2 text-sm font-medium text-gray-200 transition-colors group-hover:text-white">
          {title}
        </h3>
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs text-gray-400">{rating.toFixed(1)}</span>
            {year && (
              <>
                <span className="mx-1 text-gray-600">•</span>
                <span className="text-xs text-gray-500">{year}</span>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default MovieCard;
