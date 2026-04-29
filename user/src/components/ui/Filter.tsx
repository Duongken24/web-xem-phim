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
  onFilterChange,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    country: '',
    year: '',
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
    <div className="rounded-2xl border border-white/10 bg-gray-950/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Lọc phim</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400"
          >
            <X className="h-4 w-4" />
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <button
            onClick={() => toggleDropdown('category')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-white transition hover:border-white/20 hover:bg-gray-800"
          >
            <span className="text-sm">
              {filters.category ? categories.find((c) => c.id === filters.category)?.label : 'Thể loại'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {openDropdown === 'category' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-gray-900 shadow-lg">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleFilterChange('category', cat.id)}
                  className="w-full px-4 py-2 text-left text-sm text-white transition hover:bg-gray-800"
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
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleDropdown('country')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-white transition hover:border-white/20 hover:bg-gray-800"
          >
            <span className="text-sm">
              {filters.country ? countries.find((c) => c.id === filters.country)?.label : 'Quốc gia'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {openDropdown === 'country' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-gray-900 shadow-lg">
              {countries.map((country) => (
                <button
                  key={country.id}
                  onClick={() => handleFilterChange('country', country.id)}
                  className="w-full px-4 py-2 text-left text-sm text-white transition hover:bg-gray-800"
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
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => toggleDropdown('year')}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-white transition hover:border-white/20 hover:bg-gray-800"
          >
            <span className="text-sm">
              {filters.year ? years.find((y) => y.id === filters.year)?.label : 'Năm phát hành'}
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {openDropdown === 'year' && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-gray-900 shadow-lg">
              {years.map((year) => (
                <button
                  key={year.id}
                  onClick={() => handleFilterChange('year', year.id)}
                  className="w-full px-4 py-2 text-left text-sm text-white transition hover:bg-gray-800"
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
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Filter;
