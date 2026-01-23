import React, { useEffect, useState } from 'react';
import TMDBService from '../services/tmdb.service';
import type { TMDBMovie } from '../types/tmdb.types';

const TestTMDBPage: React.FC = () => {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Test: Get popular movies
        const response = await TMDBService.getPopularMovies(1);
        setMovies(response.results.slice(0, 6));

        console.log('✅ TMDB API Connected Successfully!');
        console.log('Sample movie:', response.results[0]);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch movies');
        console.error('❌ TMDB API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-xl">Testing TMDB Connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8 bg-red-900/20 border border-red-500 rounded-lg">
          <h1 className="text-3xl font-bold mb-4 text-red-500">❌ Connection Failed</h1>
          <p className="text-xl mb-4">Error: {error}</p>
          <div className="bg-black/50 p-4 rounded mt-4">
            <h3 className="font-bold mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Check if you've added your TMDB API Key to <code>.env</code> file</li>
              <li>Make sure the variable name is <code>VITE_TMDB_API_KEY</code></li>
              <li>Restart the dev server after adding the API key</li>
              <li>Verify your API key is valid at <a href="https://www.themoviedb.org/settings/api" target="_blank" className="text-orange-500 underline">TMDB Settings</a></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Success Header */}
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2 text-green-500">✅ TMDB API Connected!</h1>
          <p className="text-gray-300">
            Successfully fetched {movies.length} popular movies from The Movie Database
          </p>
        </div>

        {/* Movie Grid */}
        <h2 className="text-2xl font-bold mb-4">Popular Movies from TMDB:</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="bg-gray-900 rounded-lg overflow-hidden hover:scale-105 transition">
              <img
                src={TMDBService.getTMDBImageUrl(movie.poster_path, 'w342')}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />
              <div className="p-3">
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{movie.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>⭐ {TMDBService.formatRating(movie.vote_average)}</span>
                  <span>•</span>
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* API Info */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">API Information:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Base URL:</span>
              <p className="font-mono bg-black/50 p-2 rounded mt-1">
                {import.meta.env.VITE_TMDB_BASE_URL}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Image Base URL:</span>
              <p className="font-mono bg-black/50 p-2 rounded mt-1">
                {import.meta.env.VITE_TMDB_IMAGE_BASE_URL}
              </p>
            </div>
            <div>
              <span className="text-gray-400">API Key Status:</span>
              <p className="font-mono bg-black/50 p-2 rounded mt-1 text-green-500">
                ✅ Valid ({import.meta.env.VITE_TMDB_API_KEY?.substring(0, 8)}...)
              </p>
            </div>
            <div>
              <span className="text-gray-400">Language:</span>
              <p className="font-mono bg-black/50 p-2 rounded mt-1">
                vi-VN (Vietnamese)
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-400">🎯 Next Steps:</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✅ TMDB API integrated successfully</li>
            <li>📝 Ready to fetch movie data from TMDB</li>
            <li>🎬 Ready to build Movie Detail Page</li>
            <li>🔍 Ready to implement Search functionality</li>
            <li>💾 Ready to sync TMDB data to Supabase</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestTMDBPage;
