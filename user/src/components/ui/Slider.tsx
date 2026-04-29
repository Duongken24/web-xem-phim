import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import TMDBService from '../../services/tmdb.service';

interface SlideItem {
  id: string | number;
  title: string;
  description: string;
  image: string;
  rating?: number;
  year?: number;
}

interface SliderProps {
  slides: SlideItem[];
  autoPlay?: boolean;
  interval?: number;
}

const Slider: React.FC<SliderProps> = ({ slides, autoPlay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (slides.length === 0) return null;

  return (
    <div className="group relative isolate w-full overflow-hidden bg-black">
      <div
        className="flex h-[82vh] min-h-[560px] transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative h-full min-w-full">
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = TMDBService.getTMDBFallbackImage('backdrop');
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_28%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />

            <div className="absolute inset-0 flex items-end pb-24 md:pb-28 lg:pb-32">
              <div className="container mx-auto px-4 md:px-8 lg:px-16">
                <div className="max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Nổi bật hôm nay
                  </div>

                  <h2 className="text-4xl font-bold text-white drop-shadow-2xl md:text-6xl lg:text-7xl">
                    {slide.title}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-gray-200 drop-shadow-lg md:text-lg lg:text-xl">
                    {slide.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    {slide.rating && (
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 backdrop-blur-sm">
                        <span className="text-xl text-orange-500">★</span>
                        <span className="font-semibold text-white">{slide.rating}/10</span>
                      </div>
                    )}
                    {slide.year && (
                      <span className="rounded-full border border-white/10 bg-black/45 px-4 py-2 font-medium text-gray-300 backdrop-blur-sm">
                        {slide.year}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-black/45 px-4 py-2 font-medium text-gray-300 backdrop-blur-sm">
                      Streaming tối nay
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      to={`/watch/${slide.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3 font-semibold text-black shadow-lg transition hover:bg-gray-200"
                    >
                      <Play className="h-6 w-6 fill-black" />
                      Xem Ngay
                    </Link>
                    <Link
                      to={`/movie/${slide.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-gray-700/45 px-7 py-3 font-semibold text-white transition hover:bg-gray-700/70"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Thông Tin
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-3 text-white opacity-0 transition hover:scale-110 hover:bg-black/75 group-hover:opacity-100 md:block"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-3 text-white opacity-0 transition hover:scale-110 hover:bg-black/75 group-hover:opacity-100 md:block"
      >
        <ChevronRight className="h-8 w-8" />
      </button>

      <div className="absolute bottom-8 right-6 flex gap-2 md:right-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            aria-label={`Chuyển đến slide ${index + 1}`}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-white' : 'w-6 bg-gray-500 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Slider;
