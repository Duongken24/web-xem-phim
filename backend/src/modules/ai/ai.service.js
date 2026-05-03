export const createAiService = ({
  buildBehaviorProfileQuery,
  checkAiRecommendationServiceHealth,
  callAiRecommendationService,
  isTmdbEnabled,
  getAiFallbackMovies,
  getCatalogFallbackMovies,
  getBehaviorRecommendationMovies,
  getChatRecommendationMovies,
  getRecommendationCatalog,
  getUserFromToken,
  mergeHybridRecommendationItems,
  persistChatRecommendationLogs,
}) => ({
  buildEmptyDirectRecommendationResult({
    query,
    onlyDatabaseMovies,
    warning = "",
    explanation = "",
    source = "fallback",
  }) {
    return {
      success: true,
      source,
      query,
      normalizedQuery: query,
      normalized_query: query,
      detectedFilters: {},
      detected_filters: {},
      warning,
      explanation,
      only_database_movies: onlyDatabaseMovies,
      recommended_movies: [],
      movies: [],
      items: [],
    };
  },

  async getDirectRecommendations(req) {
    const query = String(req.body?.query || "").replace(/[<>]/g, "").trim().slice(0, 240);
    const topN = Math.max(1, Math.min(Number(req.body?.top_n || req.body?.limit || 10), 50));
    const requestedOnlyDatabaseMovies = req.body?.only_database_movies !== undefined
      ? Boolean(req.body.only_database_movies)
      : false;

    if (!query) {
      const err = new Error("Vui long nhap nhu cau xem phim.");
      err.statusCode = 400;
      throw err;
    }

    let user = null;
    if (req.headers.authorization) {
      user = await getUserFromToken(req);
    }

    let tmdbEnabled = true;
    try {
      tmdbEnabled = await isTmdbEnabled();
    } catch (_error) {
      tmdbEnabled = true;
    }

    const onlyDatabaseMovies = requestedOnlyDatabaseMovies || !tmdbEnabled;
    let payload = {
      normalized_query: query,
      detected_filters: {},
      recommended_movies: [],
      only_database_movies: onlyDatabaseMovies,
    };
    let aiMovies = [];
    let finalMovies = [];
    let source = "ai_service";
    let warning = !tmdbEnabled
      ? "TMDB dang tat, he thong chi tra phim co trong database noi bo."
      : "";
    let explanation = "";

    const aiReady = typeof checkAiRecommendationServiceHealth === "function"
      ? await checkAiRecommendationServiceHealth().catch(() => false)
      : true;

    if (!aiReady) {
      return this.buildEmptyDirectRecommendationResult({
        query,
        onlyDatabaseMovies,
        warning: warning
          ? `${warning} AI service tam thoi chua san sang, vui long thu lai sau.`
          : "AI service tam thoi chua san sang, vui long thu lai sau.",
      });
    }

    try {
      const aiResult = await callAiRecommendationService({
        query,
        topN,
        userId: user?.id || null,
        onlyDatabaseMovies,
      });

      payload = aiResult?.payload || payload;
      aiMovies = Array.isArray(aiResult?.movies) ? aiResult.movies : [];
      finalMovies = aiMovies;
    } catch (err) {
      console.warn("[AI DIRECT] Service fallback:", err.message);

      return this.buildEmptyDirectRecommendationResult({
        query,
        onlyDatabaseMovies,
        warning: warning
          ? `${warning} AI service tam thoi gap loi, dang tra ket qua rong an toan.`
          : "AI service tam thoi gap loi, dang tra ket qua rong an toan.",
      });
    }

    if (onlyDatabaseMovies && user?.id) {
      try {
        const profile = await buildBehaviorProfileQuery(user.id);
        if (profile?.hasSignals) {
          const behaviorMovies = await getBehaviorRecommendationMovies({
            profile,
            limit: topN,
            aiMovies,
            excludeMovieIds: profile.seedMovieIds,
          });

          if (behaviorMovies.length) {
            finalMovies = behaviorMovies;
            source = "chat_behavior";
            explanation = "Da rerank ket qua AI theo lich su xem, yeu thich, danh gia va tim kiem cua ban.";
          }
        }
      } catch (err) {
        console.warn("[AI DIRECT] Behavior rerank fallback:", err.message);
      }
    }

    if (onlyDatabaseMovies && finalMovies.length === 0) {
      let fallbackResult = null;

      try {
        fallbackResult = await getChatRecommendationMovies({
          query,
          userId: user?.id || null,
          currentMovieId: null,
          limit: topN,
        });
      } catch (err) {
        console.warn("[AI DIRECT] Empty fallback:", err.message);

        return this.buildEmptyDirectRecommendationResult({
          query,
          onlyDatabaseMovies,
          warning: warning
            ? `${warning} AI tam thoi chua co ket qua phu hop.`
            : "AI tam thoi chua co ket qua phu hop.",
          explanation,
        });
      }

      return {
        success: true,
        source: fallbackResult.source || "fallback",
        query,
        normalizedQuery: fallbackResult.normalizedQuery || query,
        normalized_query: fallbackResult.normalizedQuery || query,
        detectedFilters: fallbackResult.detectedFilters || {},
        detected_filters: fallbackResult.detectedFilters || {},
        warning: fallbackResult.warning || warning,
        explanation: fallbackResult.explanation || explanation,
        only_database_movies: true,
        recommended_movies: fallbackResult.items,
        movies: fallbackResult.items,
        items: fallbackResult.items,
      };
    }

    return {
      success: true,
      source,
      query,
      normalizedQuery: payload.normalized_query || query,
      normalized_query: payload.normalized_query || query,
      detectedFilters: payload.detected_filters || {},
      detected_filters: payload.detected_filters || {},
      warning,
      explanation,
      only_database_movies:
        typeof payload.only_database_movies === "boolean"
          ? payload.only_database_movies || onlyDatabaseMovies
          : onlyDatabaseMovies,
      recommended_movies: Array.isArray(payload.recommended_movies) ? payload.recommended_movies : [],
      movies: finalMovies,
      items: finalMovies,
    };
  },

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
          ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon."
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
          ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon."
          : "Dang dung phim noi bat vi ban chua dang nhap.",
        summary: "Dua tren so thich va hoat dong gan day cua ban.",
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
            ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon."
            : behaviorMovies.length
              ? "Dang dung xep hang tu hanh vi that trong he thong."
              : "Chua du du lieu ca nhan hoa, dang dung phim noi bat.",
          summary: "Dua tren so thich va hoat dong gan day cua ban.",
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

      const aiReady = typeof checkAiRecommendationServiceHealth === "function"
        ? await checkAiRecommendationServiceHealth().catch(() => false)
        : true;

      if (!aiReady) {
        throw new Error("AI service tam thoi chua san sang.");
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
            ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon."
            : "AI chua tim duoc phim khop ho so cua ban, dang dung phim noi bat.",
          summary: "Dua tren so thich va hoat dong gan day cua ban.",
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
        summary: "Dua tren so thich va hoat dong gan day cua ban.",
        preferenceQuery: profile.query,
        activity: profile.activity,
        topGenres: profile.topGenres,
        topCountry: profile.topCountry,
        topLanguages: profile.topLanguages,
        topTypes: profile.topTypes,
        topSearchTerms: profile.topSearchTerms,
        normalizedQuery: payload.normalized_query || profile.query,
        detectedFilters: payload.detected_filters || {},
        warning: hybridResult.hasTmdbFallback ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon." : "",
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
          ? "Mot so goi y duoc bo sung tu TMDB de danh sach phong phu hon."
          : behaviorMovies.length
            ? "AI service tam thoi chua san sang, dang dung goi y tu hanh vi that."
            : "Chua the tao goi y ca nhan luc nay, dang dung phim noi bat.",
        summary: "Dua tren so thich va hoat dong gan day cua ban.",
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
