const DEMO_DISABLE_SUBSCRIPTION_LOGIC = true;

const buildFallbackContentAccessPayload = (movieId) => ({
  content: {
    movie_id: movieId,
    internal_movie_id: movieId,
    movie_title: null,
    movie_status: null,
    is_hidden: false,
    is_featured: false,
    is_premium: false,
    is_blocked: false,
    is_locally_available: true,
    should_hide_from_listing: false,
  },
  access: {
    requiresPremium: false,
    hasPremiumAccess: false,
    isLocallyAvailable: true,
    canAccess: true,
    currentSubscription: null,
  },
});

const bypassPremiumFields = (payload) => {
  if (!payload) return buildFallbackContentAccessPayload(0);

  return {
    content: {
      ...payload.content,
      is_premium: false,
    },
    access: {
      ...payload.access,
      requiresPremium: false,
      hasPremiumAccess: false,
      canAccess: Boolean(
        !payload.content?.should_hide_from_listing && payload.access?.isLocallyAvailable
      ),
      currentSubscription: null,
    },
  };
};

export const createContentAccessService = ({
  buildMovieContentAccessPayload,
  getCurrentSubscriptionForUser,
  getMovieById,
  normalizeInteger,
  supabase,
}) => {
  void getCurrentSubscriptionForUser;

  const getContentAccess = async (movieId, userId) => {
    const normalizedMovieId = normalizeInteger(movieId);
    if (!normalizedMovieId) {
      return buildFallbackContentAccessPayload(0);
    }

    try {
      const movie = await getMovieById(normalizedMovieId);
      const payload = await buildMovieContentAccessPayload(
        movie,
        userId || null,
        DEMO_DISABLE_SUBSCRIPTION_LOGIC ? null : undefined
      );

      return DEMO_DISABLE_SUBSCRIPTION_LOGIC ? bypassPremiumFields(payload) : payload;
    } catch (error) {
      console.warn("[CONTENT ACCESS]", error?.message || error);
      return buildFallbackContentAccessPayload(normalizedMovieId);
    }
  };

  const getBatchContentAccess = async (rawMovieIds, userId) => {
    const movieIds = Array.from(
      new Set(
        (Array.isArray(rawMovieIds) ? rawMovieIds : [])
          .map((movieId) => normalizeInteger(movieId))
          .filter((movieId) => Number.isInteger(movieId) && movieId > 0)
      )
    );

    if (!movieIds.length) {
      return [];
    }

    let movies = [];

    try {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .in("id", movieIds);

      if (error) {
        console.warn("[CONTENT ACCESS BATCH]", error.message);
        return movieIds.map((movieId) => buildFallbackContentAccessPayload(movieId).content);
      }

      movies = data || [];
    } catch (error) {
      console.warn("[CONTENT ACCESS BATCH]", error?.message || error);
      return movieIds.map((movieId) => buildFallbackContentAccessPayload(movieId).content);
    }

    const order = new Map(movieIds.map((movieId, index) => [movieId, index]));
    const payloads = await Promise.all(
      movies.map(async (movie) => {
        try {
          const payload = await buildMovieContentAccessPayload(
            movie,
            userId || null,
            DEMO_DISABLE_SUBSCRIPTION_LOGIC ? null : undefined
          );
          return DEMO_DISABLE_SUBSCRIPTION_LOGIC ? bypassPremiumFields(payload) : payload;
        } catch (error) {
          console.warn("[CONTENT ACCESS MOVIE]", error?.message || error);
          return buildFallbackContentAccessPayload(normalizeInteger(movie?.id) || 0);
        }
      })
    );

    return payloads
      .map((payload) => payload.content)
      .sort((a, b) => (order.get(a.movie_id) ?? 0) - (order.get(b.movie_id) ?? 0));
  };

  return {
    getBatchContentAccess,
    getContentAccess,
  };
};
