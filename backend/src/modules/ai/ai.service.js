export const createAiService = ({
  buildBehaviorProfileQuery,
  callAiRecommendationService,
  getAiFallbackMovies,
  getCatalogFallbackMovies,
  getBehaviorRecommendationMovies,
  getChatRecommendationMovies,
  getRecommendationCatalog,
  getUserFromToken,
  mergeHybridRecommendationItems,
  persistChatRecommendationLogs,
}) => ({
  async getMovieRecommendations(req) {
    const query = String(req.body?.query || "").replace(/[<>]/g, "").trim().slice(0, 240);
    const topN = Math.max(1, Math.min(Number(req.body?.top_n || req.body?.limit || 10), 20));
    const currentMovieId = Number.isInteger(Number(req.body?.current_movie_id))
      ? Number(req.body?.current_movie_id)
      : null;

    if (!query) {
      const err = new Error("Vui long nhap nhu cau xem phim.");
      err.statusCode = 400;
      throw err;
    }

    let user = null;
    if (req.headers.authorization) {
      user = await getUserFromToken(req);
    }

    try {
      const result = await getChatRecommendationMovies({
        query,
        userId: user?.id || null,
        currentMovieId,
        limit: topN,
      });

      await persistChatRecommendationLogs({
        userId: user?.id || null,
        query,
        normalizedQuery: result.normalizedQuery,
        explanation: result.explanation,
        movies: result.items,
        source: result.source,
      });

      return {
        success: true,
        source: result.source,
        query,
        normalizedQuery: result.normalizedQuery,
        normalized_query: result.normalizedQuery,
        detectedFilters: result.detectedFilters,
        detected_filters: result.detectedFilters,
        warning: result.warning || "",
        explanation: result.explanation,
        current_movie_id: currentMovieId,
        movies: result.items,
        items: result.items,
      };
    } catch (err) {
      console.warn("[AI RECOMMENDATIONS] Fallback:", err.message);

      const profile = user?.id ? await buildBehaviorProfileQuery(user.id).catch(() => null) : null;
      const recommendationCatalog = await getRecommendationCatalog().catch(() => []);
      const fallbackMovies = await getCatalogFallbackMovies({ limit: topN, profile });
      const hybridResult = await mergeHybridRecommendationItems({
        items: fallbackMovies,
        query,
        limit: topN,
        catalog: recommendationCatalog,
      });

      return {
        success: true,
        source: hybridResult.hasTmdbFallback ? "hybrid" : "fallback",
        warning: hybridResult.hasTmdbFallback
          ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
          : "AI chat tam thoi gap loi, dang dung phim noi bo san co trong he thong.",
        query,
        normalizedQuery: query,
        normalized_query: query,
        detectedFilters: {},
        detected_filters: {},
        explanation:
          "AI chat tam thoi gap loi, he thong dang hien phim noi bo co the xem ngay de ban tiep tuc kham pha.",
        current_movie_id: currentMovieId,
        movies: hybridResult.items,
        items: hybridResult.items,
      };
    }
  },

  async getPersonalizedRecommendations(req) {
    const topN = Math.max(1, Math.min(Number(req.body?.top_n || req.body?.limit || 10), 20));

    let user = null;
    if (req.headers.authorization) {
      user = await getUserFromToken(req);
    }

    if (!user?.id) {
      const fallbackMovies = await getAiFallbackMovies(topN);
      const hybridResult = await mergeHybridRecommendationItems({
        items: fallbackMovies,
        query: "",
        limit: topN,
      });

      return {
        success: true,
        source: hybridResult.hasTmdbFallback ? "hybrid" : "fallback",
        personalized: false,
        warning: hybridResult.hasTmdbFallback
          ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
          : "Dang dung phim noi bat vi ban chua dang nhap.",
        summary: "Dựa trên sở thích và hoạt động gần đây của bạn.",
        preferenceQuery: "",
        activity: {
          watchCount: 0,
          favoriteCount: 0,
          ratingCount: 0,
          aiQueryCount: 0,
        },
        movies: hybridResult.items,
      };
    }

    try {
      const profile = await buildBehaviorProfileQuery(user.id);
      const recommendationCatalog = await getRecommendationCatalog().catch(() => []);

      if (!profile.query) {
        const behaviorMovies = profile.hasSignals
          ? await getBehaviorRecommendationMovies({
              profile,
              limit: topN,
              excludeMovieIds: profile.seedMovieIds,
            })
          : [];
        const fallbackMovies = behaviorMovies.length ? behaviorMovies : await getAiFallbackMovies(topN);
        const hybridResult = await mergeHybridRecommendationItems({
          items: fallbackMovies,
          query: profile.query || "",
          limit: topN,
          catalog: recommendationCatalog,
        });

        return {
          success: true,
          source: hybridResult.hasTmdbFallback ? "hybrid" : behaviorMovies.length ? "behavior" : "fallback",
          personalized: behaviorMovies.length,
          warning: hybridResult.hasTmdbFallback
            ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
            : behaviorMovies.length
              ? "Dang dung xep hang tu hanh vi that trong he thong."
              : "Chua du du lieu ca nhan hoa, dang dung phim noi bat.",
          summary: "Dựa trên sở thích và hoạt động gần đây của bạn.",
          preferenceQuery: "",
          activity: profile.activity,
          topGenres: profile.topGenres,
          topCountry: profile.topCountry,
          topLanguages: profile.topLanguages,
          topTypes: profile.topTypes,
          topSearchTerms: profile.topSearchTerms,
          movies: hybridResult.items,
        };
      }

      const { payload, movies } = await callAiRecommendationService({
        query: profile.query,
        topN,
        userId: user.id,
      });

      const behaviorMovies = await getBehaviorRecommendationMovies({
        profile,
        limit: topN,
        aiMovies: movies,
        excludeMovieIds: profile.seedMovieIds,
      });

      const hybridResult = await mergeHybridRecommendationItems({
        items: behaviorMovies.length ? behaviorMovies : movies,
        query: profile.query,
        limit: topN,
        catalog: recommendationCatalog,
      });

      if (!behaviorMovies.length && !movies.length) {
        const fallbackMovies = await getAiFallbackMovies(topN);
        const fallbackHybridResult = await mergeHybridRecommendationItems({
          items: fallbackMovies,
          query: profile.query,
          limit: topN,
          catalog: recommendationCatalog,
        });

        return {
          success: true,
          source: fallbackHybridResult.hasTmdbFallback ? "hybrid" : "fallback",
          personalized: false,
          warning: fallbackHybridResult.hasTmdbFallback
            ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
            : "AI chua tim duoc phim khop ho so cua ban, dang dung phim noi bat.",
          summary: "Dựa trên sở thích và hoạt động gần đây của bạn.",
          preferenceQuery: profile.query,
          activity: profile.activity,
          topGenres: profile.topGenres,
          topCountry: profile.topCountry,
          topLanguages: profile.topLanguages,
          topTypes: profile.topTypes,
          topSearchTerms: profile.topSearchTerms,
          normalizedQuery: payload.normalized_query || profile.query,
          detectedFilters: payload.detected_filters || {},
          movies: fallbackHybridResult.items,
        };
      }

      return {
        success: true,
        source: hybridResult.hasTmdbFallback ? "hybrid" : behaviorMovies.length ? "behavior" : "ai",
        personalized: true,
        summary: "Dựa trên sở thích và hoạt động gần đây của bạn.",
        preferenceQuery: profile.query,
        activity: profile.activity,
        topGenres: profile.topGenres,
        topCountry: profile.topCountry,
        topLanguages: profile.topLanguages,
        topTypes: profile.topTypes,
        topSearchTerms: profile.topSearchTerms,
        normalizedQuery: payload.normalized_query || profile.query,
        detectedFilters: payload.detected_filters || {},
        warning: hybridResult.hasTmdbFallback ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn." : "",
        movies: hybridResult.items,
      };
    } catch (err) {
      console.warn("[AI PERSONALIZED] Fallback:", err.message);

      const profile = await buildBehaviorProfileQuery(user.id).catch(() => null);
      const recommendationCatalog = await getRecommendationCatalog().catch(() => []);
      const behaviorMovies = profile?.hasSignals
        ? await getBehaviorRecommendationMovies({
            profile,
            limit: topN,
            excludeMovieIds: profile.seedMovieIds,
          }).catch(() => [])
        : [];
      const fallbackMovies = behaviorMovies.length ? behaviorMovies : await getAiFallbackMovies(topN);
      const hybridResult = await mergeHybridRecommendationItems({
        items: fallbackMovies,
        query: profile?.query || "",
        limit: topN,
        catalog: recommendationCatalog,
      });

      return {
        success: true,
        source: hybridResult.hasTmdbFallback ? "hybrid" : behaviorMovies.length ? "behavior" : "fallback",
        personalized: behaviorMovies.length,
        warning: hybridResult.hasTmdbFallback
          ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
          : behaviorMovies.length
            ? "AI service tam thoi chua san sang, dang dung goi y tu hanh vi that."
            : "Chua the tao goi y ca nhan luc nay, dang dung phim noi bat.",
        summary: "Dựa trên sở thích và hoạt động gần đây của bạn.",
        preferenceQuery: "",
        activity:
          profile?.activity || {
            watchCount: 0,
            favoriteCount: 0,
            ratingCount: 0,
            aiQueryCount: 0,
            searchCount: 0,
            searchClickCount: 0,
            clickCount: 0,
            aiRecommendationCount: 0,
          },
        topGenres: profile?.topGenres || [],
        topCountry: profile?.topCountry || null,
        topLanguages: profile?.topLanguages || [],
        topTypes: profile?.topTypes || [],
        topSearchTerms: profile?.topSearchTerms || [],
        movies: hybridResult.items,
      };
    }
  },
});
