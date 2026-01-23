import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface SlideItem {
  id: number;
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
    <div className="relative w-full h-[85vh] overflow-hidden">
      {/* Slides */}
      <div
        className="flex transition-transform duration-700 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="min-w-full h-full relative">
            {/* Background Image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />

            {/* Overlay Gradient - Netflix Style */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex items-end pb-32">
              <div className="container mx-auto px-4 md:px-8 lg:px-16">
                <div className="max-w-3xl">
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
                    {slide.title}
                  </h2>
                  <p className="text-gray-200 text-base md:text-lg lg:text-xl mb-6 line-clamp-3 drop-shadow-lg max-w-2xl">
                    {slide.description}
                  </p>

                  <div className="flex items-center gap-4 mb-8">
                    {slide.rating && (
                      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded">
                        <span className="text-orange-500 text-xl">⭐</span>
                        <span className="text-white font-semibold">{slide.rating}/10</span>
                      </div>
                    )}
                    {slide.year && (
                      <span className="text-gray-300 bg-black/50 backdrop-blur-sm px-3 py-1 rounded font-medium">
                        {slide.year}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button className="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded font-bold flex items-center gap-2 transition shadow-lg">
                      <Play className="w-6 h-6 fill-black" />
                      Xem Ngay
                    </button>
                    <button className="bg-gray-600/70 hover:bg-gray-600/90 backdrop-blur-sm text-white px-8 py-3 rounded font-bold flex items-center gap-2 transition">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Thông Tin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition opacity-0 group-hover:opacity-100 hover:scale-110"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition opacity-0 group-hover:opacity-100 hover:scale-110"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Dots Navigation */}
      <div className="absolute bottom-8 right-8 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-8' : 'bg-gray-500 w-6 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Slider;