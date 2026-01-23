import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';

interface MovieCardProps {
  id: number;
  title: string;
  image: string;
  quality: string;
  type: string;
  rating?: number;
  year?: string;
  overview?: string;
}

const MovieCard: React.FC<MovieCardProps> = ({
  id,
  title,
  image,
  quality,
  type,
  rating,
  year,
  overview
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/movie/${id}`}
      className="group relative block overflow-hidden rounded-md transition-all duration-300 hover:scale-105 hover:z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />

        {/* Quality Badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">
          {quality}
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded z-10">
          {type}
        </div>

        {/* Hover Overlay with Movie Info */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Movie Title */}
          <h3 className="text-white font-bold text-sm line-clamp-2 mb-2 drop-shadow-lg">
            {title}
          </h3>

          {/* Rating and Year */}
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
            {rating !== undefined && rating > 0 && (
              <>
                <span className="flex items-center bg-yellow-500/20 px-2 py-0.5 rounded">
                  <Star className="w-3 h-3 text-yellow-500 mr-1 fill-yellow-500" />
                  <span className="text-yellow-500 font-semibold">{rating.toFixed(1)}</span>
                </span>
              </>
            )}
            {year && (
              <>
                {rating !== undefined && rating > 0 && <span className="text-gray-500">•</span>}
                <span className="bg-white/10 px-2 py-0.5 rounded">{year}</span>
              </>
            )}
          </div>

          {/* Overview/Description */}
          {overview && (
            <p className="text-gray-400 text-xs line-clamp-3 mb-3">
              {overview}
            </p>
          )}

          {/* Play Button */}
          <div className="flex items-center justify-center">
            <div className="bg-red-600 hover:bg-red-700 rounded-full p-2 transition-colors">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Movie Title - Visible when not hovering */}
      <div className={`mt-2 px-1 transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
        <h3 className="text-sm font-medium line-clamp-2 text-gray-300 group-hover:text-white transition-colors">
          {title}
        </h3>
        {/* Rating below title when not hovering */}
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-gray-400">{rating.toFixed(1)}</span>
            {year && (
              <>
                <span className="text-gray-600 mx-1">•</span>
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
