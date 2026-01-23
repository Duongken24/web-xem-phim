import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionTitleProps {
  title: string;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ 
  title, 
  showViewAll = false, 
  onViewAllClick,
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-between mb-4 group ${className}`}>
      <h2 className="text-xl md:text-2xl font-bold text-white">
        {title}
      </h2>

      {showViewAll && (
        <button
          onClick={onViewAllClick}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium group"
        >
          <span>Xem tất cả</span>
          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
};

export default SectionTitle;