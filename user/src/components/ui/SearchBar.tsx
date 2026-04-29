import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Tim kiem phim...',
  className = '',
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
    }
  };

  return (
    <div className={`relative mx-auto w-full max-w-2xl ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-white/10 bg-gray-900/90 py-3 pl-12 pr-12 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />

        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
