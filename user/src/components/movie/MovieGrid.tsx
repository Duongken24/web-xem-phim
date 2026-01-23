import React from 'react';

interface MovieGridProps {
  children: React.ReactNode;
  className?: string;
}

const MovieGrid: React.FC<MovieGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default MovieGrid;