export const createAdminMoviesService = ({
  buildAdminMoviePayload,
  getAdminMoviePayloadById,
  getAdminMoviesPayload,
  getMovieById,
  getStorageConfigSummary,
  normalizeInteger,
  supabase,
  syncMovieGenres,
}) => ({
  async listMovies() {
    return getAdminMoviesPayload();
  },

  async getMeta() {
    const [{ data: genres, error: genresError }, { data: countries, error: countriesError }] = await Promise.all([
      supabase.from("genres").select("id, name, slug, description").order("name", { ascending: true }),
      supabase.from("countries").select("id, name, code").order("name", { ascending: true }),
    ]);

    if (genresError) throw new Error(genresError.message);
    if (countriesError) throw new Error(countriesError.message);

    return {
      genres: genres || [],
      countries: countries || [],
      storage: getStorageConfigSummary(),
    };
  },

  async createMovie(body, adminUserId) {
    const moviePayload = buildAdminMoviePayload(body || {}, adminUserId);

    const { data: movie, error } = await supabase
      .from("movies")
      .insert(moviePayload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await syncMovieGenres(movie.id, body?.genres);
    return getAdminMoviePayloadById(movie.id);
  },

  async updateMovie(movieId, body, adminUserId) {
    const existingMovie = await getMovieById(movieId);
    const moviePayload = buildAdminMoviePayload(body || {}, adminUserId, existingMovie);

    const { data: movie, error } = await supabase
      .from("movies")
      .update(moviePayload)
      .eq("id", existingMovie.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await syncMovieGenres(movie.id, body?.genres);
    return getAdminMoviePayloadById(movie.id);
  },

  async deleteMovie(movieId) {
    const movie = await getMovieById(movieId);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("movies")
      .update({
        status: "deleted",
        is_active: false,
        deleted_at: now,
        updated_at: now,
      })
      .eq("id", movie.id)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return {
      movie_id: movie.id,
      action: "soft_delete",
    };
  },

  async upsertMovie(body, adminUserId) {
    let existingMovie = null;
    const movieId = normalizeInteger(body.movie_id || body.id);
    const tmdbId = normalizeInteger(body.tmdb_id);

    if (movieId) {
      existingMovie = await getMovieById(movieId);
    } else if (tmdbId) {
      const { data, error } = await supabase.from("movies").select("*").eq("tmdb_id", tmdbId).maybeSingle();
      if (error) throw new Error(error.message);
      existingMovie = data || null;
    }

    const moviePayload = buildAdminMoviePayload(body, adminUserId, existingMovie);

    const result = existingMovie
      ? await supabase.from("movies").update(moviePayload).eq("id", existingMovie.id).select("*").single()
      : await supabase.from("movies").insert(moviePayload).select("*").single();

    if (result.error) {
      throw new Error(result.error.message);
    }

    await syncMovieGenres(result.data.id, body.genres);
    const fullMovie = await getAdminMoviePayloadById(result.data.id);

    return {
      action: existingMovie ? "updated" : "inserted",
      movie: fullMovie,
    };
  },
});
