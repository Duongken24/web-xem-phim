import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
}

interface FilterProps {
  categories?: FilterOption[];
  countries?: FilterOption[];
  years?: FilterOption[];
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  category: string;
  country: string;
  year: string;
}

const Filter: React.FC<FilterProps> = ({ 
  categories = [], 
  countries = [], 
  years = [],
  onFilterChange 
}) => {
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    country: '',
    year: ''
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleFilterChange = (type: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [type]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
    setOpenDropdown(null);
  };

  const clearFilter = (type: keyof FilterState) => {
    const newFilters = { ...filters, [type]: '' };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const clearAllFilters = () => {
    const newFilters = { category: '', country: '', year: '' };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const hasActiveFilters = filters.category || filters.country || filters.year;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Lọc Phim</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-orange-500 hover:text-orange-400 text-sm flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('category')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-between transition"
          >
            <span className="text-sm">
              {filters.category 
                ? categories.find(c => c.id === filters.category)?.label 
                : 'Thể Loại'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'category' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleFilterChange('category', cat.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm transition"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {filters.category && (
            <button
              onClick={() => clearFilter('category')}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Country Filter */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('country')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-between transition"
          >
            <span className="text-sm">
              {filters.country 
                ? countries.find(c => c.id === filters.country)?.label 
                : 'Quốc Gia'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'country' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {countries.map((country) => (
                <button
                  key={country.id}
                  onClick={() => handleFilterChange('country', country.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm transition"
                >
                  {country.label}
                </button>
              ))}
            </div>
          )}

          {filters.country && (
            <button
              onClick={() => clearFilter('country')}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Year Filter */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('year')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-between transition"
          >
            <span className="text-sm">
              {filters.year 
                ? years.find(y => y.id === filters.year)?.label 
                : 'Năm Phát Hành'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {openDropdown === 'year' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {years.map((year) => (
                <button
                  key={year.id}
                  onClick={() => handleFilterChange('year', year.id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm transition"
                >
                  {year.label}
                </button>
              ))}
            </div>
          )}

          {filters.year && (
            <button
              onClick={() => clearFilter('year')}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Filter;