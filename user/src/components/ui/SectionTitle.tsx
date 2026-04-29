import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionTitleProps {
  title: string;
  description?: string;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  description,
  showViewAll = false,
  onViewAllClick,
  className = '',
}) => {
  const canViewAll = showViewAll && typeof onViewAllClick === 'function';

  return (
    <div className={`mb-5 flex items-end justify-between gap-4 group ${className}`}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>

      {canViewAll && (
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
