import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchResult {
  id: number;
  title: string;
  image: string;
  year?: number;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  suggestions?: SearchResult[];
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  suggestions = [],
  placeholder = 'Tìm kiếm phim...' 
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    onSearch?.(suggestion.title);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full bg-gray-900 text-white pl-12 pr-12 py-3 rounded-full border border-gray-700 focus:border-orange-500 focus:outline-none"
        />
        
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-left"
            >
              <img
                src={suggestion.image}
                alt={suggestion.title}
                className="w-12 h-16 object-cover rounded"
              />
              <div>
                <p className="text-white font-medium">{suggestion.title}</p>
                {suggestion.year && (
                  <p className="text-gray-400 text-sm">{suggestion.year}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showSuggestions && query && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 z-50">
          <p className="text-gray-400 text-center">Không tìm thấy kết quả</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;