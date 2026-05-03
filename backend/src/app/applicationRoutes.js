import { createAdminMoviesRoutes } from "../modules/admin/movies.admin.routes.js";
import { createAdminStorageRoutes } from "../modules/admin/storage.admin.routes.js";
import { createContentAdminRoutes } from "../modules/admin/content.admin.routes.js";
import { createDashboardAdminRoutes } from "../modules/admin/dashboard.admin.routes.js";
import { createPlansAdminRoutes } from "../modules/admin/plans.admin.routes.js";
import { createUsersAdminRoutes } from "../modules/admin/users.admin.routes.js";
import { createAnalyticsRoutes } from "../modules/analytics/analytics.routes.js";
import { createAiRoutes } from "../modules/ai/ai.routes.js";
import { createCatalogRoutes } from "../modules/catalog/catalog.routes.js";
import { createContentAccessRoutes } from "../modules/content-access/content-access.routes.js";
import { createMoviesRoutes } from "../modules/movies/movies.routes.js";
import { createSettingsRoutes } from "../modules/settings/settings.routes.js";
import { createStreamRoutes } from "../modules/stream/stream.routes.js";
import { createSubscriptionsRoutes } from "../modules/subscriptions/subscriptions.routes.js";
import { supabase } from "../shared/supabaseClient.js";
import {
  isSystemSettingsSchemaMissingError,
  isTmdbEnabled,
  setSystemSetting,
} from "../shared/systemSettings.js";
import { createHealthRoutes } from "./health.routes.js";
import { createRouteDependencies } from "./routeDependencies.js";

export const createApplicationRoutes = ({
  deleteObject,
  getPublicUrl,
  getStorageConfigSummary,
  isStorageConfigured,
  runSingleUpload,
  streamService,
  testStorageConnection,
  uploadObject,
  useTmdbFallback,
}) => {
  const {
    assertMovieSourcesR2Columns,
    assertVideoQualitiesR2Columns,
    buildAdminMoviePayload,
    buildBehaviorProfileQuery,
    buildMovieContentAccessPayload,
    buildSimilarMovieProfile,
    buildStorageObjectKey,
    checkAiRecommendationServiceHealth,
    callAiRecommendationService,
    createEpisodeVideoQuality,
    createMovieSource,
    getAdminMoviePayloadById,
    getAdminMoviesPayload,
    getAdminUserFromRequest,
    getAiFallbackMovies,
    getBehaviorRecommendationMovies,
    getCatalogFallbackMovies,
    getChatRecommendationMovies,
    getCurrentSubscriptionForUser,
    getEpisodeById,
    getHasPlaySource,
    getMovieById,
    getOptionalUserFromToken,
    getRecommendationCatalog,
    getUserFromToken,
    mergeHybridRecommendationItems,
    normalizeInteger,
    normalizePlayableSourceType,
    persistChatRecommendationLogs,
    resolveSourceTypeFromUrl,
    scoreSimilarMovieCandidate,
    syncMovieGenres,
    updateMoviePlaybackFields,
  } = createRouteDependencies({
    getPublicUrl,
    isStorageConfigured,
  });

  return [
    createHealthRoutes(),
    createAiRoutes({
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
    }),
    createSettingsRoutes({
      getAdminUserFromRequest,
      isSystemSettingsSchemaMissingError,
      isTmdbEnabled,
      setSystemSetting,
      useTmdbFallback,
    }),
    createSubscriptionsRoutes({
      getCurrentSubscriptionForUser,
      getUserFromToken,
      supabase,
    }),
    createCatalogRoutes({
      supabase,
    }),
    createContentAccessRoutes({
      buildMovieContentAccessPayload,
      getCurrentSubscriptionForUser,
      getMovieById,
      getOptionalUserFromToken,
      normalizeInteger,
      supabase,
    }),
    createStreamRoutes({
      service: streamService,
      getUserFromToken,
    }),
    createMoviesRoutes({
      buildSimilarMovieProfile,
      getAdminMoviesPayload,
      getHasPlaySource,
      getRecommendationCatalog,
      getUserFromToken,
      scoreSimilarMovieCandidate,
      streamService,
      supabase,
    }),
    createAnalyticsRoutes({
      getOptionalUserFromToken,
    }),
    createAdminMoviesRoutes({
      buildAdminMoviePayload,
      getAdminMoviePayloadById,
      getAdminMoviesPayload,
      getAdminUserFromRequest,
      getMovieById,
      getStorageConfigSummary,
      normalizeInteger,
      supabase,
      syncMovieGenres,
    }),
    createAdminStorageRoutes({
      assertMovieSourcesR2Columns,
      assertVideoQualitiesR2Columns,
      buildStorageObjectKey,
      createEpisodeVideoQuality,
      createMovieSource,
      deleteObject,
      getAdminUserFromRequest,
      getEpisodeById,
      getMovieById,
      getStorageConfigSummary,
      isStorageConfigured,
      normalizePlayableSourceType,
      resolveSourceTypeFromUrl,
      runSingleUpload,
      supabase,
      testStorageConnection,
      updateMoviePlaybackFields,
      uploadObject,
    }),
    createDashboardAdminRoutes({
      getAdminUserFromRequest,
      supabase,
    }),
    createUsersAdminRoutes({
      getAdminUserFromRequest,
      supabase,
    }),
    createPlansAdminRoutes({
      getAdminUserFromRequest,
      supabase,
    }),
    createContentAdminRoutes({
      getAdminUserFromRequest,
      supabase,
    }),
  ];
};
