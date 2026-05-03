export const createCatalogService = ({ supabase }) => {
  const listGenres = async () => {
    const { data: activeMovies, error: moviesError } = await supabase
      .from("movies")
      .select("id")
      .eq("is_active", true)
      .eq("status", "active")
      .is("deleted_at", null);

    if (moviesError) {
      throw new Error(moviesError.message);
    }

    const movieIds = (activeMovies || [])
      .map((movie) => Number(movie.id))
      .filter((movieId) => Number.isInteger(movieId) && movieId > 0);

    if (!movieIds.length) {
      return [];
    }

    const { data: activeMovieGenreRows, error: movieGenreError } = await supabase
      .from("movie_genres")
      .select("genre_id")
      .in("movie_id", movieIds);

    if (movieGenreError) {
      throw new Error(movieGenreError.message);
    }

    const genreIds = [
      ...new Set(
        (activeMovieGenreRows || [])
          .map((row) => Number(row.genre_id))
          .filter((genreId) => Number.isInteger(genreId) && genreId > 0)
      ),
    ];

    if (!genreIds.length) {
      return [];
    }

    const { data: genres, error: genresError } = await supabase
      .from("genres")
      .select("id, name, slug, description, tmdb_genre_id")
      .in("id", genreIds)
      .order("name", { ascending: true });

    if (genresError) {
      throw new Error(genresError.message);
    }

    return genres || [];
  };

  const listYears = async () => {
    const { data, error } = await supabase
      .from("movies")
      .select("release_year")
      .eq("is_active", true)
      .eq("status", "active")
      .is("deleted_at", null)
      .not("release_year", "is", null)
      .order("release_year", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return [
      ...new Set(
        (data || [])
          .map((movie) => Number(movie.release_year))
          .filter((year) => Number.isInteger(year) && year > 0)
      ),
    ].sort((a, b) => b - a);
  };

  return {
    listGenres,
    listYears,
  };
};
