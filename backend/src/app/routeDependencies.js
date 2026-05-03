import { AI_SERVICE_URL } from "../shared/constants.js";
import { getReleaseYear } from "../shared/movies-helpers.js";
import {
  normalizeBoolean,
  normalizeInteger,
  normalizeNumber,
  normalizeText,
} from "../shared/normalize.js";
import { supabase } from "../shared/supabaseClient.js";
import { isTmdbEnabled } from "../shared/systemSettings.js";
import {
  getAdminUserFromRequest as sharedGetAdminUserFromRequest,
  getOptionalUserFromToken as sharedGetOptionalUserFromToken,
  getUserFromToken as sharedGetUserFromToken,
} from "../modules/auth/auth.service.js";

export const createRouteDependencies = ({
  getPublicUrl,
  isStorageConfigured,
} = {}) => {  // ================= HELPERS =================
  const sanitizeFreeText = (value, maxLength = 240) => {
    const normalized = normalizeText(value);
    return normalized ? normalized.replace(/[<>]/g, "").slice(0, maxLength) : null;
  };
  
  const normalizeList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeText(item))
        .filter(Boolean);
    }
  
    const text = normalizeText(value);
    if (!text) return [];
  
    return text
      .split(",")
      .map((item) => normalizeText(item))
      .filter(Boolean);
  };
  
  const safeSlugSegment = (value, fallback = "item") => {
    const text = normalizeText(value) || fallback;
    const slug = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  
    return slug || fallback;
  };
  
  const buildFlexibleSlug = (title, preferredSlug, suffix) => {
    const explicitSlug = normalizeText(preferredSlug);
    const baseSlug = safeSlugSegment(explicitSlug || title || "movie");
  
    if (!suffix) return baseSlug;
    return `${baseSlug}-${suffix}`;
  };
  
  const sanitizeFileName = (value, fallback = "file") => {
    const text = normalizeText(value) || fallback;
    return text.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  };
  
  const inferMimeTypeFromUrl = (url) => {
    const value = (normalizeText(url) || "").toLowerCase();
    if (value.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
    if (value.endsWith(".ts")) return "video/mp2t";
    if (value.endsWith(".mp4")) return "video/mp4";
    if (value.endsWith(".vtt")) return "text/vtt";
    if (value.endsWith(".webp")) return "image/webp";
    if (value.endsWith(".png")) return "image/png";
    if (value.endsWith(".jpg") || value.endsWith(".jpeg")) return "image/jpeg";
    return null;
  };
  
  const isHlsUrl = (url) => {
    const value = (normalizeText(url) || "").toLowerCase();
    return value.endsWith(".m3u8") || value.includes("m3u8");
  };
  
  const normalizeMovieSourceType = (value, fallback = null) => {
    const normalized = (normalizeText(value) || "").toLowerCase();
    const allowed = new Set(["tmdb", "direct", "r2", "s3", "hls", "mp4"]);
  
    if (allowed.has(normalized)) return normalized;
    return fallback;
  };
  
  const normalizePlayableSourceType = (value, fallback = "direct") => {
    const normalized = (normalizeText(value) || "").toLowerCase();
    const allowed = new Set(["direct", "r2", "s3", "hls", "mp4"]);
  
    if (allowed.has(normalized)) return normalized;
    if (normalized === "tmdb") return fallback;
    return fallback;
  };
  
  const resolveSourceTypeFromUrl = (url, fallback = "direct") => {
    if (isHlsUrl(url)) return "hls";
  
    const mimeType = inferMimeTypeFromUrl(url);
    if (mimeType === "video/mp4") return "mp4";
    return fallback;
  };
  
  const buildStorageObjectKey = ({
    movieId,
    episodeId,
    qualityLabel,
    originalName,
    kind = "video",
  }) => {
    const qualitySegment = safeSlugSegment(qualityLabel || "original");
    const fileName = sanitizeFileName(originalName || `${kind}.${kind === "subtitle" ? "vtt" : "bin"}`);
  
    if (kind === "video") {
      if (episodeId) {
        return `videos/episodes/${episodeId}/${qualitySegment}/${fileName}`;
      }
  
      return `videos/movies/${movieId}/${qualitySegment}/${fileName}`;
    }
  
    if (kind === "poster") {
      return `images/posters/${movieId}/${fileName}`;
    }
  
    if (kind === "backdrop") {
      return `images/backdrops/${movieId}/${fileName}`;
    }
  
    if (kind === "thumbnail") {
      return `images/thumbnails/${movieId}/${fileName}`;
    }
  
    return `subtitles/${movieId}/${fileName}`;
  };
  
  const getHasPlaySource = async (movie) => {
    if (!movie) return false;
  
    if (movie.video_url || movie.stream_url) {
      return true;
    }
  
    const { data, error } = await supabase
      .from("movie_sources")
      .select("id, object_key, public_url")
      .eq("movie_id", movie.id)
      .eq("is_active", true)
      .limit(1);
  
    if (error) return false;
    return Boolean(data?.length);
  };
  
  const getUserFromToken = sharedGetUserFromToken;
  const getOptionalUserFromToken = sharedGetOptionalUserFromToken;
  const getAdminUserFromRequest = sharedGetAdminUserFromRequest;
  
  const isAnalyticsSchemaMissingError = (error) => {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();
  
    if (code === "42p01" || code === "42703") {
      return true;
    }
  
    return (
      (message.includes("search_logs") || message.includes("movie_click_logs")) &&
      (
        message.includes("does not exist") ||
        message.includes("not found") ||
        message.includes("column") ||
        message.includes("could not find the table") ||
        message.includes("schema cache")
      )
    );
  };
  
  const getContentControlForMovie = async (movieId) => {
    const { data, error } = await supabase
      .from("content_controls")
      .select("movie_id, is_hidden, is_featured, is_premium, is_blocked, note")
      .eq("movie_id", movieId)
      .maybeSingle();
  
    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }
  
    return data || null;
  };
  
  const isSubscriptionRecordActive = (subscription) => {
    if (!subscription) return false;
  
    const status = String(subscription.status || "").trim().toLowerCase();
    if (status && !["active", "trial"].includes(status)) {
      return false;
    }
  
    if (!subscription.end_date) {
      return true;
    }
  
    const normalizedEndDate = String(subscription.end_date).slice(0, 10);
    const endTime = new Date(`${normalizedEndDate}T23:59:59.999Z`).getTime();
    if (Number.isFinite(endTime)) {
      return endTime >= Date.now();
    }
  
    const today = new Date().toISOString().slice(0, 10);
    return normalizedEndDate >= today;
  };
  
  const listSubscriptionsForUser = async (userId) => {
    if (!userId) return [];
  
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, source, start_date, end_date, assigned_by, created_at, updated_at")
      .eq("user_id", userId)
      .order("end_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);
  
    if (error) {
      console.warn("[SUBSCRIPTION CHECK]", error.message);
      return [];
    }
  
    return data || [];
  };
  
  const hasActiveSubscription = async (userId) => {
    const subscriptions = await listSubscriptionsForUser(userId);
    return subscriptions.some((subscription) => isSubscriptionRecordActive(subscription));
  };
  
  const getCurrentSubscriptionForUser = async (userId) => {
    const subscriptions = await listSubscriptionsForUser(userId);
    const currentSubscription = subscriptions.find((subscription) =>
      isSubscriptionRecordActive(subscription)
    );
  
    if (!currentSubscription) {
      return null;
    }
  
    const [planResult, profileResult] = await Promise.all([
      currentSubscription.plan_id
        ? supabase
            .from("subscription_plans")
            .select("id, name, duration_days")
            .eq("id", currentSubscription.plan_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", userId)
        .maybeSingle(),
    ]);
  
    if (planResult?.error && planResult.error.code !== "PGRST116") {
      console.warn("[SUBSCRIPTION PLAN]", planResult.error.message);
    }
  
    if (profileResult?.error && profileResult.error.code !== "PGRST116") {
      console.warn("[SUBSCRIPTION PROFILE]", profileResult.error.message);
    }
  
    return {
      ...currentSubscription,
      user_email: profileResult?.data?.email || null,
      user_name: profileResult?.data?.full_name || null,
      plan_name: planResult?.data?.name || null,
      plan_duration_days: planResult?.data?.duration_days || null,
    };
  };
  
  const buildMovieContentAccessPayload = async (movie, userId = null, currentSubscription = undefined) => {
    const contentControl = await getContentControlForMovie(movie.id);
    const hasPlaySource = await getHasPlaySource(movie);
    const movieStatus = normalizeText(movie.status) || null;
    const isVisibleByMovieState =
      movie.is_active !== false && (!movieStatus || movieStatus.toLowerCase() === "active");
    const requiresPremium =
      normalizeBoolean(contentControl?.is_premium, false) ||
      normalizeBoolean(movie.is_premium, false);
    const activeSubscription =
      currentSubscription === undefined
        ? await getCurrentSubscriptionForUser(userId)
        : currentSubscription;
    const hasPremiumAccess = Boolean(activeSubscription);
    const shouldHideFromListing = Boolean(
      contentControl?.is_hidden || contentControl?.is_blocked || !isVisibleByMovieState
    );
  
    return {
      content: {
        movie_id: movie.id,
        internal_movie_id: movie.id,
        movie_title: normalizeText(movie.title) || null,
        movie_status: movieStatus,
        is_hidden: Boolean(contentControl?.is_hidden),
        is_featured: Boolean(contentControl?.is_featured ?? movie.is_featured),
        is_premium: requiresPremium,
        is_blocked: Boolean(contentControl?.is_blocked),
        is_locally_available: hasPlaySource,
        should_hide_from_listing: shouldHideFromListing,
      },
      access: {
        requiresPremium,
        hasPremiumAccess,
        isLocallyAvailable: hasPlaySource,
        canAccess: !shouldHideFromListing && hasPlaySource && (!requiresPremium || hasPremiumAccess),
        currentSubscription: activeSubscription || null,
      },
    };
  };
  
  const syncMovieGenres = async (movieId, genresInput) => {
    if (genresInput === undefined) return;
  
    const genreIds = Array.from(
      new Set(
        normalizeList(genresInput)
          .map((item) => normalizeInteger(item))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );
  
    const { error: deleteError } = await supabase.from("movie_genres").delete().eq("movie_id", movieId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  
    if (!genreIds.length) return;
  
    const { error: insertError } = await supabase.from("movie_genres").insert(
      genreIds.map((genreId) => ({
        movie_id: movieId,
        genre_id: genreId,
      }))
    );
  
    if (insertError) {
      throw new Error(insertError.message);
    }
  };
  
  const resolveAdminMovieSlug = ({ title, preferredSlug, existingSlug, fallbackSuffix }) => {
    const explicitSlug = normalizeText(preferredSlug);
    if (explicitSlug) {
      return safeSlugSegment(explicitSlug, "movie");
    }
  
    const stableExistingSlug = normalizeText(existingSlug);
    if (stableExistingSlug) {
      return stableExistingSlug;
    }
  
    return fallbackSuffix ? buildFlexibleSlug(title, null, fallbackSuffix) : safeSlugSegment(title || "movie");
  };
  
  const buildAdminMoviePayload = (body, adminUserId, existingMovie = null) => {
    const title = normalizeText(body?.title) || normalizeText(body?.original_title);
    if (!title) {
      const err = new Error("title báº¯t buá»™c");
      err.statusCode = 400;
      throw err;
    }
  
    const tmdbId = normalizeInteger(body?.tmdb_id ?? existingMovie?.tmdb_id);
    const releaseDate = normalizeText(body?.release_date);
    const releaseYear = normalizeInteger(body?.release_year) ?? getReleaseYear(releaseDate);
    const nextVideoUrl = normalizeText(body?.video_url) || normalizeText(existingMovie?.video_url);
    const nextStreamUrl =
      normalizeText(body?.stream_url) ||
      normalizeText(body?.video_url) ||
      normalizeText(existingMovie?.stream_url) ||
      nextVideoUrl;
    const fallbackVideoUrl = nextStreamUrl || nextVideoUrl;
    const fallbackSourceType =
      normalizeMovieSourceType(body?.source_type) ||
      (fallbackVideoUrl ? resolveSourceTypeFromUrl(fallbackVideoUrl, "direct") : null) ||
      normalizeMovieSourceType(existingMovie?.source_type, "direct") ||
      (tmdbId ? "tmdb" : "direct");
    const slugSuffix = existingMovie?.id || tmdbId || releaseYear || null;
  
    return {
      title,
      original_title: normalizeText(body?.original_title),
      slug: resolveAdminMovieSlug({
        title,
        preferredSlug: body?.slug,
        existingSlug: existingMovie?.slug,
        fallbackSuffix: slugSuffix,
      }),
      description: normalizeText(body?.description),
      overview: normalizeText(body?.overview),
      poster_url: normalizeText(body?.poster_url),
      poster_path: normalizeText(body?.poster_path),
      backdrop_url: normalizeText(body?.backdrop_url),
      backdrop_path: normalizeText(body?.backdrop_path),
      trailer_url: normalizeText(body?.trailer_url),
      release_year: releaseYear,
      release_date: releaseDate,
      duration: normalizeInteger(body?.duration),
      runtime_minutes: normalizeInteger(body?.runtime_minutes ?? body?.runtime),
      country_id: normalizeInteger(body?.country_id),
      vote_average: normalizeNumber(body?.vote_average),
      vote_count: normalizeInteger(body?.vote_count),
      rating: normalizeNumber(body?.rating),
      average_rating: normalizeNumber(body?.average_rating),
      total_ratings: normalizeInteger(body?.total_ratings),
      view_count: normalizeInteger(body?.view_count),
      type: normalizeText(body?.type) || existingMovie?.type || "single",
      status: normalizeText(body?.status) || existingMovie?.status || "active",
      is_featured: normalizeBoolean(body?.is_featured, existingMovie?.is_featured ?? false),
      is_trending: normalizeBoolean(body?.is_trending, existingMovie?.is_trending ?? false),
      is_active: normalizeBoolean(body?.is_active, existingMovie?.is_active ?? true),
      is_premium: normalizeBoolean(body?.is_premium, existingMovie?.is_premium ?? false),
      age_rating: normalizeText(body?.age_rating),
      video_url: nextVideoUrl,
      stream_url: nextStreamUrl,
      thumbnail_url: normalizeText(body?.thumbnail_url),
      image_url: normalizeText(body?.image_url),
      tmdb_id: tmdbId,
      imdb_id: normalizeText(body?.imdb_id),
      source_type: fallbackSourceType,
      original_language: normalizeText(body?.original_language),
      origin_country: normalizeText(body?.origin_country),
      tmdb_synced_at: tmdbId ? new Date().toISOString() : existingMovie?.tmdb_synced_at || null,
      created_by: existingMovie?.created_by || adminUserId,
      uploaded_by: adminUserId,
    };
  };
  
  const getMovieById = async (movieId) => {
    const parsedMovieId = normalizeInteger(movieId);
    if (!parsedMovieId) {
      const err = new Error("movieId khÃ´ng há»£p lá»‡");
      err.statusCode = 400;
      throw err;
    }
  
    const { data, error } = await supabase.from("movies").select("*").eq("id", parsedMovieId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
  
    if (!data) {
      const err = new Error("KhÃ´ng tÃ¬m tháº¥y phim");
      err.statusCode = 404;
      throw err;
    }
  
    return data;
  };
  
  const getEpisodeById = async (episodeId) => {
    const parsedEpisodeId = normalizeInteger(episodeId);
    if (!parsedEpisodeId) {
      const err = new Error("episodeId khÃ´ng há»£p lá»‡");
      err.statusCode = 400;
      throw err;
    }
  
    const { data, error } = await supabase.from("episodes").select("*").eq("id", parsedEpisodeId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
  
    if (!data) {
      const err = new Error("KhÃ´ng tÃ¬m tháº¥y táº­p phim");
      err.statusCode = 404;
      throw err;
    }
  
    return data;
  };
  
  const clearPrimaryMovieSources = async (movieId) => {
    const { error } = await supabase
      .from("movie_sources")
      .update({ is_primary: false })
      .eq("movie_id", movieId);
  
    if (error) {
      throw new Error(error.message);
    }
  };
  
  const updateMoviePlaybackFields = async (movieId, source) => {
    const playbackUrl =
      normalizeText(source?.playback_url) ||
      normalizeText(source?.video_url) ||
      normalizeText(source?.public_url) ||
      null;
    const sourceType = normalizePlayableSourceType(
      source?.source_type,
      resolveSourceTypeFromUrl(playbackUrl, "direct")
    );
  
    const payload = {
      source_type: sourceType,
    };
  
    if (normalizeText(source?.uploaded_by)) {
      payload.uploaded_by = normalizeText(source.uploaded_by);
    }
  
    if (playbackUrl) {
      payload.video_url = playbackUrl;
      payload.stream_url = playbackUrl;
    }
  
    const { error } = await supabase.from("movies").update(payload).eq("id", movieId);
    if (error) {
      throw new Error(error.message);
    }
  };
  
  const createMovieSource = async ({
    movieId,
    sourceType,
    videoUrl,
    qualityLabel,
    isPrimary,
    isActive,
    storageProvider,
    objectKey,
    publicUrl,
    mimeType,
    fileSize,
    duration,
    width,
    height,
    uploadedBy,
    playbackUrl,
  }) => {
    const normalizedVideoUrl = normalizeText(videoUrl);
    const normalizedObjectKey = normalizeText(objectKey);
    const normalizedPublicUrl = normalizeText(publicUrl);
  
    if (!normalizedVideoUrl && !normalizedObjectKey && !normalizedPublicUrl) {
      const err = new Error("Nguon phat phai co video_url hoac object_key/public_url");
      err.statusCode = 400;
      throw err;
    }
  
    const normalizedSourceType = normalizePlayableSourceType(
      sourceType,
      resolveSourceTypeFromUrl(normalizedVideoUrl || normalizedPublicUrl, "direct")
    );
  
    if (normalizeBoolean(isPrimary, false)) {
      await clearPrimaryMovieSources(movieId);
    }
  
    const { data, error } = await supabase
      .from("movie_sources")
      .insert({
        movie_id: movieId,
        source_type: normalizedSourceType,
        video_url: normalizedVideoUrl,
        quality_label: normalizeText(qualityLabel),
        is_primary: normalizeBoolean(isPrimary, false),
        is_active: normalizeBoolean(isActive, true),
        storage_provider: normalizeText(storageProvider),
        object_key: normalizedObjectKey,
        public_url: normalizedPublicUrl,
        mime_type: normalizeText(mimeType) || inferMimeTypeFromUrl(normalizedVideoUrl || normalizedPublicUrl),
        file_size: normalizeInteger(fileSize),
        duration: normalizeInteger(duration),
        width: normalizeInteger(width),
        height: normalizeInteger(height),
      })
      .select("*")
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    if (data?.is_primary) {
      await updateMoviePlaybackFields(movieId, { ...data, uploaded_by: uploadedBy || null, playback_url: playbackUrl || null });
    }
  
    return data;
  };
  
  const createEpisodeVideoQuality = async ({
    episodeId,
    quality,
    videoUrl,
    storageProvider,
    objectKey,
    publicUrl,
    mimeType,
    fileSize,
  }) => {
    const normalizedVideoUrl = normalizeText(videoUrl) || normalizeText(publicUrl);
  
    const { data, error } = await supabase
      .from("video_qualities")
      .insert({
        episode_id: episodeId,
        quality: normalizeText(quality) || "source",
        video_url: normalizedVideoUrl,
        storage_provider: normalizeText(storageProvider),
        object_key: normalizeText(objectKey),
        public_url: normalizeText(publicUrl),
        mime_type: normalizeText(mimeType) || inferMimeTypeFromUrl(normalizedVideoUrl),
        file_size: normalizeInteger(fileSize),
      })
      .select("*")
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  };
  
  const R2_MIGRATION_PATH = "database/migrations/20260422_add_r2_movie_sources.sql";
  const schemaColumnCache = new Set();
  
  const assertTableColumns = async (tableName, columns) => {
    const cacheKey = `${tableName}:${columns.join(",")}`;
    if (schemaColumnCache.has(cacheKey)) return;
  
    const checks = await Promise.all(
      columns.map(async (column) => {
        const { error } = await supabase.from(tableName).select(column).limit(1);
        return { column, error };
      })
    );
  
    const missingColumns = checks
      .filter(({ error }) => error?.code === "42703")
      .map(({ column }) => column);
  
    if (missingColumns.length) {
      const err = new Error(
        `Bang ${tableName} thieu cot R2: ${missingColumns.join(", ")}. Hay chay migration ${R2_MIGRATION_PATH} truoc khi upload.`
      );
      err.statusCode = 500;
      err.missingColumns = missingColumns;
      throw err;
    }
  
    const otherError = checks.find(({ error }) => error);
    if (otherError?.error) {
      throw new Error(otherError.error.message);
    }
  
    schemaColumnCache.add(cacheKey);
  };
  
  const assertMovieSourcesR2Columns = () =>
    assertTableColumns("movie_sources", ["storage_provider", "object_key", "public_url", "mime_type", "file_size"]);
  
  const assertVideoQualitiesR2Columns = () =>
    assertTableColumns("video_qualities", ["storage_provider", "object_key", "public_url", "mime_type", "file_size"]);
  
  const getAdminMoviePayloadById = async (movieId) => {
    const movie = await getMovieById(movieId);
  
    const [
      { data: sources, error: sourcesError },
      { data: episodes, error: episodesError },
      { data: movieGenres, error: movieGenresError },
      { data: contentControl, error: contentControlError },
    ] = await Promise.all([
      supabase.from("movie_sources").select("*").eq("movie_id", movie.id).order("updated_at", { ascending: false }),
      supabase.from("episodes").select("*").eq("movie_id", movie.id).order("episode_number", { ascending: true }),
      supabase.from("movie_genres").select("genre_id").eq("movie_id", movie.id),
      supabase.from("content_controls").select("*").eq("movie_id", movie.id).maybeSingle(),
    ]);
  
    if (sourcesError) throw new Error(sourcesError.message);
    if (episodesError) throw new Error(episodesError.message);
    if (movieGenresError) throw new Error(movieGenresError.message);
    if (contentControlError && contentControlError.code !== "PGRST116") throw new Error(contentControlError.message);
  
    const episodeIds = (episodes || []).map((episode) => episode.id).filter(Boolean);
    const { data: episodeQualities, error: episodeQualitiesError } = episodeIds.length
      ? await supabase.from("video_qualities").select("*").in("episode_id", episodeIds)
      : { data: [], error: null };
  
    if (episodeQualitiesError) {
      throw new Error(episodeQualitiesError.message);
    }
  
    const qualitiesByEpisodeId = new Map();
    for (const quality of episodeQualities || []) {
      const list = qualitiesByEpisodeId.get(quality.episode_id) || [];
      list.push(quality);
      qualitiesByEpisodeId.set(quality.episode_id, list);
    }
  
    return {
      ...movie,
      sources: sources || [],
      episodes: (episodes || []).map((episode) => ({
        ...episode,
        qualities: qualitiesByEpisodeId.get(episode.id) || [],
      })),
      genres: (movieGenres || [])
        .map((row) => Number(row.genre_id))
        .filter((genreId) => Number.isInteger(genreId) && genreId > 0),
      content_control: contentControl || null,
      has_play_source: Boolean(movie.video_url || movie.stream_url || (sources || []).length),
    };
  };
  
  const getAdminMoviesPayload = async () => {
    const { data: movies, error: moviesError } = await supabase
      .from("movies")
      .select("*")
      .order("id", { ascending: false });
  
    if (moviesError) {
      throw new Error(moviesError.message);
    }
  
    const movieIds = (movies || []).map((movie) => movie.id).filter(Boolean);
    if (!movieIds.length) return [];
  
    const [
      { data: sources, error: sourcesError },
      { data: episodes, error: episodesError },
      { data: movieGenres, error: movieGenresError },
      { data: contentControls, error: contentControlsError },
    ] = await Promise.all([
      supabase.from("movie_sources").select("*").in("movie_id", movieIds).order("updated_at", { ascending: false }),
      supabase.from("episodes").select("*").in("movie_id", movieIds).order("episode_number", { ascending: true }),
      supabase.from("movie_genres").select("movie_id, genre_id").in("movie_id", movieIds),
      supabase.from("content_controls").select("*").in("movie_id", movieIds),
    ]);
  
    if (sourcesError) throw new Error(sourcesError.message);
    if (episodesError) throw new Error(episodesError.message);
    if (movieGenresError) throw new Error(movieGenresError.message);
    if (contentControlsError && contentControlsError.code !== "PGRST116") throw new Error(contentControlsError.message);
  
    const episodeIds = (episodes || []).map((episode) => episode.id).filter(Boolean);
    const { data: episodeQualities, error: episodeQualitiesError } = episodeIds.length
      ? await supabase.from("video_qualities").select("*").in("episode_id", episodeIds)
      : { data: [], error: null };
  
    if (episodeQualitiesError) {
      throw new Error(episodeQualitiesError.message);
    }
  
    const sourcesByMovieId = new Map();
    for (const source of sources || []) {
      const list = sourcesByMovieId.get(source.movie_id) || [];
      list.push(source);
      sourcesByMovieId.set(source.movie_id, list);
    }
  
    const qualitiesByEpisodeId = new Map();
    for (const quality of episodeQualities || []) {
      const list = qualitiesByEpisodeId.get(quality.episode_id) || [];
      list.push(quality);
      qualitiesByEpisodeId.set(quality.episode_id, list);
    }
  
    const episodesByMovieId = new Map();
    for (const episode of episodes || []) {
      const list = episodesByMovieId.get(episode.movie_id) || [];
      list.push({
        ...episode,
        qualities: qualitiesByEpisodeId.get(episode.id) || [],
      });
      episodesByMovieId.set(episode.movie_id, list);
    }
  
    const genreIdsByMovieId = new Map();
    for (const row of movieGenres || []) {
      const list = genreIdsByMovieId.get(row.movie_id) || [];
      list.push(row.genre_id);
      genreIdsByMovieId.set(row.movie_id, list);
    }
  
    const contentByMovieId = new Map((contentControls || []).map((item) => [item.movie_id, item]));
  
    return (movies || []).map((movie) => ({
      ...movie,
      sources: sourcesByMovieId.get(movie.id) || [],
      episodes: episodesByMovieId.get(movie.id) || [],
      genres: genreIdsByMovieId.get(movie.id) || [],
      content_control: contentByMovieId.get(movie.id) || null,
      has_play_source:
        movie.has_play_source ??
        Boolean(
          movie.video_url ||
            movie.stream_url ||
            (sourcesByMovieId.get(movie.id) || []).length
        ),
    }));
  };
  
  const normalizeAiMovie = (movie, index = 0) => {
    const movieId = Number(movie.movie_id || movie.id);
    const tmdbId = Number(movie.tmdb_id);
    const normalizedMovieId = Number.isFinite(movieId) && movieId > 0 ? movieId : null;
    const normalizedTmdbId = Number.isFinite(tmdbId) && tmdbId > 0 ? tmdbId : null;
  
    if (!normalizedMovieId && !normalizedTmdbId) return null;
  
    const matchReason = Array.isArray(movie.match_reason)
      ? movie.match_reason.filter(Boolean).join(", ")
      : movie.match_reason || movie.reason || "";
    const availability = normalizedMovieId ? "internal" : "tmdb_only";
    const actionType = normalizedMovieId && Boolean(movie.has_play_source) ? "watch_now" : "view_detail";
  
    return {
      movie_id: normalizedMovieId,
      internal_movie_id: normalizedMovieId,
      tmdb_id: normalizedTmdbId,
      title: movie.title || movie.original_title || `Phim goi y #${index + 1}`,
      original_title: movie.original_title || null,
      slug: movie.slug || null,
      poster_path: movie.poster_path || null,
      poster_url: movie.poster_url || null,
      release_year: movie.release_year || movie.year || null,
      average_rating: Number(movie.average_rating || movie.vote_average || 0),
      score: Number(movie.score || movie.ranking_score || 0),
      reason: matchReason,
      reason_tags: Array.isArray(movie.reason_tags) ? movie.reason_tags.filter(Boolean) : [],
      source: movie.source || "ai",
      source_type: movie.source_type || null,
      has_play_source: Boolean(movie.has_play_source),
      availability,
      action_type: actionType,
    };
  };
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || "";
  const TMDB_BASE_URL = (process.env.TMDB_BASE_URL || process.env.VITE_TMDB_BASE_URL || "https://api.themoviedb.org/3").replace(
    /\/$/,
    ""
  );
  const TMDB_IMAGE_BASE_URL = (
    process.env.TMDB_IMAGE_BASE_URL ||
    process.env.VITE_TMDB_IMAGE_BASE_URL ||
    "https://image.tmdb.org/t/p"
  ).replace(/\/$/, "");
  
  const buildRecommendationDedupKey = (movie) => {
    const tmdbId = normalizeInteger(movie?.tmdb_id);
    if (tmdbId) return `tmdb:${tmdbId}`;
  
    const title = normalizeText(movie?.title || movie?.original_title || "");
    const year = normalizeInteger(movie?.release_year);
    return `title:${title}:${year || "na"}`;
  };
  
  const tmdbFetch = async (endpoint, params = {}) => {
    const tmdbEnabled = await isTmdbEnabled();
    if (!tmdbEnabled || !TMDB_API_KEY) return null;
  
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", TMDB_API_KEY);
    url.searchParams.set("language", "vi-VN");
  
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
  
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`TMDB returned ${response.status}`);
      }
  
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };
  
  const fetchTmdbFallbackMovies = async ({ query = "", limit = 10, catalog = [] } = {}) => {
    const tmdbEnabled = await isTmdbEnabled();
    if (!tmdbEnabled || !TMDB_API_KEY) return [];
  
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
    const endpoints = [];
    const normalizedQuery = String(query || "").trim();
  
    if (normalizedQuery) {
      endpoints.push(["/search/movie", { query: normalizedQuery, page: 1, include_adult: false }]);
    }
  
    endpoints.push(
      ["/trending/movie/week", { page: 1 }],
      ["/movie/popular", { page: 1 }]
    );
  
    const catalogByTmdbId = new Map(
      (catalog || [])
        .filter((movie) => normalizeInteger(movie?.tmdb_id) && movie?.is_available_for_recommendation)
        .map((movie) => [normalizeInteger(movie.tmdb_id), movie])
    );
    const results = [];
    const seenKeys = new Set();
  
    for (const [endpoint, params] of endpoints) {
      let payload = null;
  
      try {
        payload = await tmdbFetch(endpoint, params);
      } catch (error) {
        console.warn("[TMDB FALLBACK] Request failed:", error?.message || error);
        continue;
      }
  
      const movies = Array.isArray(payload?.results) ? payload.results : [];
  
      for (const movie of movies) {
        const tmdbId = normalizeInteger(movie?.id);
        if (!tmdbId) continue;
  
        const dedupKey = buildRecommendationDedupKey({
          tmdb_id: tmdbId,
          title: movie?.title,
          original_title: movie?.original_title,
          release_year: normalizeInteger(String(movie?.release_date || "").slice(0, 4)),
        });
        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);
  
        const matchedCatalogMovie = catalogByTmdbId.get(tmdbId);
        if (matchedCatalogMovie) {
          results.push(
            buildChatResponseMovie(matchedCatalogMovie, {
              score: 0.12,
              source: "tmdb_internal",
              reasonTags: ["query_match", "playable"],
            })
          );
        } else {
          results.push(
            normalizeAiMovie(
              {
                movie_id: null,
                tmdb_id: tmdbId,
                title: movie?.title || movie?.original_title,
                original_title: movie?.original_title || null,
                poster_path: movie?.poster_path || null,
                poster_url: movie?.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}` : null,
                release_year: normalizeInteger(String(movie?.release_date || "").slice(0, 4)),
                average_rating: Number(movie?.vote_average || 0),
                score: 0.08,
                reason: "Bổ sung từ TMDB để danh sách phong phú hơn.",
                reason_tags: ["tmdb_fallback"],
                source: "tmdb_only",
                has_play_source: false,
              },
              results.length
            )
          );
        }
  
        if (results.length >= safeLimit) {
          return results.filter(Boolean).slice(0, safeLimit);
        }
      }
    }
  
    return results.filter(Boolean).slice(0, safeLimit);
  };
  
  const mergeHybridRecommendationItems = async ({ items = [], query = "", limit = 10, catalog = [] } = {}) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
    const merged = [];
    const seenKeys = new Set();
  
    for (const item of items || []) {
      const normalizedItem = normalizeAiMovie(item, merged.length);
      if (!normalizedItem) continue;
  
      const dedupKey = buildRecommendationDedupKey(normalizedItem);
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      merged.push(normalizedItem);
  
      if (merged.length >= safeLimit) {
        return { items: merged.slice(0, safeLimit), hasTmdbFallback: false };
      }
    }
  
    const remaining = safeLimit - merged.length;
    const tmdbEnabled = await isTmdbEnabled();
    if (remaining <= 0 || !tmdbEnabled) {
      return { items: merged.slice(0, safeLimit), hasTmdbFallback: false };
    }
  
    const tmdbFallbackItems = await fetchTmdbFallbackMovies({ query, limit: remaining * 2, catalog }).catch(() => []);
    let hasTmdbFallback = false;
  
    for (const item of tmdbFallbackItems) {
      const normalizedItem = normalizeAiMovie(item, merged.length);
      if (!normalizedItem) continue;
  
      const dedupKey = buildRecommendationDedupKey(normalizedItem);
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      merged.push(normalizedItem);
      hasTmdbFallback = true;
  
      if (merged.length >= safeLimit) break;
    }
  
    return {
      items: merged.slice(0, safeLimit),
      hasTmdbFallback,
    };
  };
  
  const getAiFallbackMovies = async (limit = 10) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
  
    const { data: movieRows, error: movieError } = await supabase
      .from("movies")
      .select(
        "id, tmdb_id, title, original_title, poster_path, poster_url, release_year, average_rating, vote_average, is_trending, is_featured, view_count, status, is_active, video_url, stream_url"
      )
      .eq("is_active", true)
      .eq("status", "active")
      .order("is_trending", { ascending: false })
      .order("is_featured", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(Math.max(safeLimit * 2, 20));
  
    if (movieError) {
      throw new Error(movieError.message);
    }
  
    const candidateRows = [];
    for (const movie of movieRows || []) {
      const contentControl = await getContentControlForMovie(movie.id);
      if (contentControl?.is_hidden || contentControl?.is_blocked) {
        continue;
      }
  
      const hasPlaySource = await getHasPlaySource(movie);
      if (!hasPlaySource) {
        continue;
      }
  
      candidateRows.push(movie);
      if (candidateRows.length >= safeLimit) break;
    }
  
    return candidateRows
      .map((movie, index) =>
        normalizeAiMovie(
          {
            ...movie,
            movie_id: movie.id,
            average_rating: movie.average_rating || movie.vote_average,
            score: 0,
            source: "fallback",
          },
          index
        )
      )
      .filter(Boolean);
  };
  
  const AI_HEALTH_TIMEOUT_MS = 2500;
  const AI_RECOMMEND_TIMEOUT_MS = 7000;

  const checkAiRecommendationServiceHealth = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_HEALTH_TIMEOUT_MS);

    try {
      const healthResponse = await fetch(`${AI_SERVICE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!healthResponse.ok) {
        return false;
      }

      const payload = await healthResponse.json().catch(() => null);
      if (payload && typeof payload.status === "string") {
        return /^(ok|healthy|ready)$/i.test(payload.status);
      }

      return true;
    } catch (_error) {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  };

  const callAiRecommendationService = async ({ query, topN, userId, onlyDatabaseMovies = true }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_RECOMMEND_TIMEOUT_MS);
  
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          top_n: topN,
          only_database_movies: Boolean(onlyDatabaseMovies),
          user_id: userId || null,
        }),
        signal: controller.signal,
      });
  
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(errorText || `AI service returned ${aiResponse.status}`);
      }
  
      const payload = await aiResponse.json();
      const movies = (payload.recommended_movies || [])
        .map((movie, index) => normalizeAiMovie(movie, index))
        .filter(Boolean)
        .slice(0, topN);
  
      return { payload, movies };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(
          `AI service tai ${AI_SERVICE_URL} phan hoi qua cham. Hãy kiểm tra Python service voi GET /health hoặc chay lai tu repo root: cd ai && python3 ai_service.py; tu backend: cd ../ai && python3 ai_service.py`
        );
      }
  
      const message = String(error?.message || "");
      if (/fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|EHOSTUNREACH/i.test(message)) {
        throw new Error(
          `Khong ket noi duoc AI service tai ${AI_SERVICE_URL}. Hãy chay Python AI service tu repo root: cd ai && python3 ai_service.py; tu backend: cd ../ai && python3 ai_service.py`
        );
      }
  
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
  
  const BEHAVIOR_STOP_WORDS = new Set([
    "a",
    "about",
    "an",
    "and",
    "ban",
    "bo",
    "boi",
    "cho",
    "cua",
    "dang",
    "de",
    "duoc",
    "hay",
    "he",
    "in",
    "is",
    "la",
    "loai",
    "movie",
    "movies",
    "mot",
    "nhung",
    "noi",
    "o",
    "or",
    "phim",
    "series",
    "show",
    "su",
    "tai",
    "that",
    "the",
    "tren",
    "tu",
    "va",
    "ve",
    "voi",
    "xem",
  ]);
  
  const LANGUAGE_LABELS = {
    en: "English",
    es: "Spanish",
    fr: "French",
    hi: "Hindi",
    ja: "Japanese",
    ko: "Korean",
    th: "Thai",
    vi: "Vietnamese",
    zh: "Chinese",
  };
  
  const TYPE_QUERY_LABELS = {
    series: "series",
    single: "movie",
  };
  
  const normalizeBehaviorText = (value) =>
    (normalizeText(value) || "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  
  const tokenizeBehaviorText = (value, maxTokens = 16) =>
    Array.from(
      new Set(
        normalizeBehaviorText(value)
          .split(" ")
          .map((token) => token.trim())
          .filter(
            (token) =>
              token &&
              token.length >= 2 &&
              !BEHAVIOR_STOP_WORDS.has(token) &&
              !/^\d{1,2}$/.test(token)
          )
          .slice(0, maxTokens)
      )
    );
  
  const addWeightedValue = (map, key, value, normalizer = null) => {
    const rawKey = normalizer ? normalizer(key) : normalizeText(key);
    if (!rawKey || !Number.isFinite(value) || value === 0) return;
    map.set(rawKey, (map.get(rawKey) || 0) + value);
  };
  
  const mapToObject = (map, normalizer = null) => {
    const result = {};
    for (const [key, value] of map.entries()) {
      const normalizedKey = normalizer ? normalizer(key) : key;
      if (!normalizedKey || !Number.isFinite(value) || value <= 0) continue;
      result[normalizedKey] = Number(value.toFixed(4));
    }
    return result;
  };
  
  const getTopWeightedKeys = (map, limit = 5) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
  
  const uniqueBehaviorParts = (parts) => {
    const seen = new Set();
    return parts.filter((part) => {
      const normalized = normalizeBehaviorText(part);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };
  
  const toBehaviorQueryLanguage = (value) => {
    const normalized = normalizeBehaviorText(value);
    return LANGUAGE_LABELS[normalized] || normalizeText(value) || null;
  };
  
  const toBehaviorQueryType = (value) => {
    const normalized = normalizeBehaviorText(value);
    return TYPE_QUERY_LABELS[normalized] || normalizeText(value) || null;
  };
  
  const buildMovieSearchableText = (...values) =>
    normalizeBehaviorText(
      values
        .flat()
        .filter(Boolean)
        .join(" ")
    );
  
  const buildBehaviorProfileQuery = async (userId) => {
    const profile = {
      query: "",
      summary: "",
      topGenres: [],
      topCountry: null,
      topLanguages: [],
      topTypes: [],
      topSearchTerms: [],
      seedMovieIds: [],
      hasSignals: false,
      activity: {
        watchCount: 0,
        favoriteCount: 0,
        ratingCount: 0,
        aiQueryCount: 0,
        searchCount: 0,
        searchClickCount: 0,
        clickCount: 0,
        aiRecommendationCount: 0,
      },
      affinity: {
        keywordWeights: {},
        genreWeights: {},
        countryWeights: {},
        languageWeights: {},
        typeWeights: {},
        movieWeights: {},
      },
    };
  
    const [
      { data: watchRows, error: watchError },
      { data: favoriteRows, error: favoriteError },
      { data: ratingRows, error: ratingError },
      { data: aiHistoryRows, error: aiHistoryError },
      { data: aiRecommendationRows, error: aiRecommendationError },
      { data: searchRows, error: searchError },
      { data: clickRows, error: clickError },
    ] = await Promise.all([
      supabase
        .from("watch_history")
        .select("movie_id, progress, last_watched_at")
        .eq("user_id", userId)
        .order("last_watched_at", { ascending: false })
        .limit(40),
      supabase
        .from("favorites")
        .select("movie_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("ratings")
        .select("movie_id, rating, updated_at, created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("ai_chat_history")
        .select("message, response, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("ai_recommendations")
        .select("movie_id, score, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("search_logs")
        .select("query, normalized_query, source_page, result_count, clicked_movie_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("movie_click_logs")
        .select("movie_id, source_page, source_module, query_text, recommendation_source, rank_position, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
  
    if (watchError) throw new Error(watchError.message);
    if (favoriteError) throw new Error(favoriteError.message);
    if (ratingError) throw new Error(ratingError.message);
    if (aiHistoryError && aiHistoryError.code !== "PGRST116") {
      throw new Error(aiHistoryError.message);
    }
    if (aiRecommendationError && aiRecommendationError.code !== "PGRST116") {
      throw new Error(aiRecommendationError.message);
    }
    if (searchError && !isAnalyticsSchemaMissingError(searchError) && searchError.code !== "PGRST116") {
      throw new Error(searchError.message);
    }
    if (clickError && !isAnalyticsSchemaMissingError(clickError) && clickError.code !== "PGRST116") {
      throw new Error(clickError.message);
    }
  
    const scoreByMovieId = new Map();
    const keywordScore = new Map();
    const languageScore = new Map();
    const typeScore = new Map();
    const queryFrequency = new Map();
    const addMovieScore = (movieId, value) => {
      const numericMovieId = Number(movieId);
      if (!Number.isFinite(numericMovieId) || numericMovieId <= 0 || !Number.isFinite(value) || value === 0) return;
      scoreByMovieId.set(numericMovieId, (scoreByMovieId.get(numericMovieId) || 0) + value);
    };
    const addKeywordWeights = (text, baseWeight) => {
      tokenizeBehaviorText(text).forEach((token, index) => {
        const weight = Math.max(baseWeight - index * 0.08, 0.12);
        addWeightedValue(keywordScore, token, weight, normalizeBehaviorText);
      });
    };
  
    const latestWatchByMovieId = new Map();
    for (const row of watchRows || []) {
      const movieId = Number(row.movie_id);
      if (!Number.isFinite(movieId) || movieId <= 0 || latestWatchByMovieId.has(movieId)) continue;
      latestWatchByMovieId.set(movieId, row);
    }
  
    for (const row of latestWatchByMovieId.values()) {
      const progress = Math.max(0, Math.min(Number(row.progress) || 0, 100));
      addMovieScore(row.movie_id, 1.2 + Math.min(progress / 100, 1) * 1.8);
    }
  
    const favoriteMovieIds = new Set();
    for (const row of favoriteRows || []) {
      favoriteMovieIds.add(Number(row.movie_id));
      addMovieScore(row.movie_id, 3.5);
    }
  
    const latestRatingByMovieId = new Map();
    for (const row of ratingRows || []) {
      const movieId = Number(row.movie_id);
      if (!Number.isFinite(movieId) || movieId <= 0 || latestRatingByMovieId.has(movieId)) continue;
      latestRatingByMovieId.set(movieId, row);
    }
  
    let positiveRatingsTotal = 0;
    let positiveRatingsCount = 0;
    for (const row of latestRatingByMovieId.values()) {
      const rating = Number(row.rating) || 0;
      if (rating >= 4) {
        addMovieScore(row.movie_id, 1.5 + rating);
        positiveRatingsTotal += rating;
        positiveRatingsCount += 1;
      } else if (rating >= 3) {
        addMovieScore(row.movie_id, 1.5);
      }
    }
  
    for (const row of aiRecommendationRows || []) {
      const recommendationScore = Number(row.score) || 0;
      addMovieScore(row.movie_id, 0.35 + Math.min(Math.max(recommendationScore, 0), 1.5) * 0.25);
    }
  
    const searchRowsSafe = searchRows || [];
    for (const row of searchRowsSafe) {
      const normalizedQuery = normalizeText(row.normalized_query) || normalizeText(row.query);
      if (normalizedQuery) {
        addWeightedValue(queryFrequency, normalizedQuery, 1, normalizeBehaviorText);
      }
  
      const baseWeight = row.clicked_movie_id ? 1.25 : 0.75;
      addKeywordWeights(normalizedQuery || row.query, baseWeight);
  
      if (row.clicked_movie_id) {
        const resultCount = Number(row.result_count) || 0;
        const resultBonus = resultCount > 0 && resultCount <= 5 ? 0.3 : 0;
        addMovieScore(row.clicked_movie_id, baseWeight + 0.95 + resultBonus);
      }
    }
  
    const clickRowsSafe = clickRows || [];
    for (const row of clickRowsSafe) {
      const normalizedSourceModule = normalizeBehaviorText(row.source_module || row.source_page);
      const normalizedRecommendationSource = normalizeBehaviorText(row.recommendation_source);
      const rankPosition = Math.max(Number(row.rank_position) || 0, 0);
      const rankBonus = rankPosition > 0 ? Math.max(0.38 - Math.min(rankPosition - 1, 9) * 0.03, 0.08) : 0.12;
      const searchModuleBonus =
        normalizedSourceModule.includes("search") || normalizeBehaviorText(row.query_text)
          ? 0.35
          : 0;
      const recommendationBonus = normalizedRecommendationSource ? 0.18 : 0;
  
      addMovieScore(row.movie_id, 0.95 + rankBonus + searchModuleBonus + recommendationBonus);
      addKeywordWeights(row.query_text, 0.7 + searchModuleBonus);
    }
  
    const aiHistoryRowsSafe = aiHistoryRows || [];
    for (const row of aiHistoryRowsSafe) {
      addKeywordWeights(row.message, 0.55);
      addKeywordWeights(row.response, 0.22);
    }
  
    const movieIds = [...scoreByMovieId.entries()]
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([movieId]) => movieId)
      .slice(0, 30);
  
    profile.activity = {
      watchCount: latestWatchByMovieId.size,
      favoriteCount: favoriteMovieIds.size,
      ratingCount: latestRatingByMovieId.size,
      aiQueryCount: aiHistoryRowsSafe.length,
      searchCount: searchRowsSafe.length,
      searchClickCount: searchRowsSafe.filter((row) => Number(row.clicked_movie_id) > 0).length,
      clickCount: clickRowsSafe.length,
      aiRecommendationCount: (aiRecommendationRows || []).length,
    };
  
    if (!movieIds.length && keywordScore.size === 0) {
      profile.summary = "Chua du du lieu tim kiem, click, xem va danh gia de tao goi y ca nhan.";
      return profile;
    }
  
    const [
      { data: movieRows, error: movieRowsError },
      { data: movieGenreRows, error: movieGenreError },
      { data: genreRows, error: genreError },
      { data: countryRows, error: countryError },
    ] = await Promise.all([
      supabase
        .from("movies")
        .select(
          "id, title, original_title, description, overview, release_year, release_date, duration, runtime_minutes, type, country_id, original_language, origin_country, age_rating, vote_average, vote_count, rating, average_rating, total_ratings, is_trending, is_featured, is_active, is_premium, status, tmdb_id"
        )
        .in("id", movieIds),
      supabase
        .from("movie_genres")
        .select("movie_id, genre_id")
        .in("movie_id", movieIds),
      supabase.from("genres").select("id, name"),
      supabase.from("countries").select("id, name, code"),
    ]);
  
    if (movieRowsError) throw new Error(movieRowsError.message);
    if (movieGenreError) throw new Error(movieGenreError.message);
    if (genreError) throw new Error(genreError.message);
    if (countryError) throw new Error(countryError.message);
  
    const genreNameById = new Map((genreRows || []).map((row) => [Number(row.id), String(row.name || "").trim()]));
    const countryNameById = new Map((countryRows || []).map((row) => [Number(row.id), String(row.name || row.code || "").trim()]));
    const movieById = new Map((movieRows || []).map((row) => [Number(row.id), row]));
    const genreScore = new Map();
    const countryScore = new Map();
  
    for (const row of movieGenreRows || []) {
      const movieId = Number(row.movie_id);
      const genreId = Number(row.genre_id);
      const movieScore = scoreByMovieId.get(movieId) || 0;
      const genreName = genreNameById.get(genreId);
      if (!genreName || movieScore <= 0) continue;
      genreScore.set(genreName, (genreScore.get(genreName) || 0) + movieScore);
    }
  
    for (const movieId of movieIds) {
      const movie = movieById.get(movieId);
      if (!movie) continue;
      const movieScore = scoreByMovieId.get(movieId) || 0;
      const countryName = countryNameById.get(Number(movie.country_id));
      if (countryName) {
        countryScore.set(countryName, (countryScore.get(countryName) || 0) + movieScore);
      } else if (normalizeText(movie.origin_country)) {
        addWeightedValue(countryScore, movie.origin_country, movieScore);
      }
  
      if (normalizeText(movie.original_language)) {
        addWeightedValue(languageScore, movie.original_language, movieScore, normalizeBehaviorText);
      }
  
      if (normalizeText(movie.type)) {
        addWeightedValue(typeScore, movie.type, movieScore, normalizeBehaviorText);
      }
    }
  
    const topGenres = [...genreScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    const topCountry = [...countryScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([name]) => name)[0] || null;
    const topLanguages = getTopWeightedKeys(languageScore, 3);
    const topTypes = getTopWeightedKeys(typeScore, 2);
    const topSearchTerms = getTopWeightedKeys(keywordScore, 6);
  
    const seedMovieTitle = movieIds
      .map((movieId) => movieById.get(movieId))
      .filter(Boolean)
      .map((movie) => String(movie.title || movie.original_title || "").trim())
      .find(Boolean);
  
    const repeatedSearchPhrases = getTopWeightedKeys(queryFrequency, 2);
    const queryParts = [];
    if (topCountry) queryParts.push(topCountry);
    queryParts.push(...topGenres);
    queryParts.push(...topLanguages.map(toBehaviorQueryLanguage).filter(Boolean));
    queryParts.push(...topTypes.map(toBehaviorQueryType).filter(Boolean));
    queryParts.push(...topSearchTerms.slice(0, 3));
    if (positiveRatingsCount > 0 && positiveRatingsTotal / positiveRatingsCount >= 4.2) {
      queryParts.push("high rating");
    }
    if (repeatedSearchPhrases.length > 0) {
      queryParts.push(repeatedSearchPhrases[0]);
    }
    if (seedMovieTitle) {
      queryParts.push(seedMovieTitle);
    }
  
    profile.query = uniqueBehaviorParts(queryParts)
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 240);
    profile.topGenres = topGenres;
    profile.topCountry = topCountry;
    profile.topLanguages = topLanguages;
    profile.topTypes = topTypes;
    profile.topSearchTerms = topSearchTerms;
    profile.seedMovieIds = movieIds.slice(0, 12);
    profile.hasSignals = Boolean(movieIds.length || topSearchTerms.length || aiHistoryRowsSafe.length);
    profile.affinity = {
      keywordWeights: mapToObject(keywordScore, normalizeBehaviorText),
      genreWeights: mapToObject(genreScore, normalizeBehaviorText),
      countryWeights: mapToObject(countryScore, normalizeBehaviorText),
      languageWeights: mapToObject(languageScore, normalizeBehaviorText),
      typeWeights: mapToObject(typeScore, normalizeBehaviorText),
      movieWeights: mapToObject(scoreByMovieId, (value) => String(Number(value))),
    };
  
    const preferenceBits = [];
    if (topGenres.length) preferenceBits.push(topGenres.slice(0, 2).join(", "));
    if (topCountry) preferenceBits.push(`phim ${topCountry}`);
    if (topSearchTerms.length) preferenceBits.push(`tu khoa ${topSearchTerms.slice(0, 2).join(", ")}`);
  
    const signalBits = [];
    if (profile.activity.searchCount) signalBits.push(`tim kiem ${profile.activity.searchCount}`);
    if (profile.activity.clickCount) signalBits.push(`click ${profile.activity.clickCount}`);
    if (profile.activity.watchCount) signalBits.push(`xem ${profile.activity.watchCount}`);
    if (profile.activity.favoriteCount) signalBits.push(`yeu thich ${profile.activity.favoriteCount}`);
    if (profile.activity.ratingCount) signalBits.push(`danh gia ${profile.activity.ratingCount}`);
  
    profile.summary =
      preferenceBits.length || signalBits.length
        ? `Dua tren ${signalBits.join(", ") || "hanh vi gan day"}, he thong dang uu tien ${preferenceBits.join(" va ") || "phim phu hop nhat voi gu cua ban"}.`
        : "Dua tren lich su tim kiem, click va xem gan day cua ban.";
  
    return profile;
  };
  
  const getRecommendationCatalog = async (targetMovieIds = null) => {
    const normalizedTargetIds = Array.from(
      new Set(
        (Array.isArray(targetMovieIds) ? targetMovieIds : [])
          .map((movieId) => normalizeInteger(movieId))
          .filter((movieId) => Number.isInteger(movieId) && movieId > 0)
      )
    );
  
    let moviesQuery = supabase.from("movies").select(
      "id, tmdb_id, slug, title, original_title, description, overview, release_year, release_date, duration, runtime_minutes, type, country_id, original_language, origin_country, age_rating, vote_average, vote_count, rating, average_rating, total_ratings, is_trending, is_featured, is_active, is_premium, status, deleted_at, poster_url, poster_path, backdrop_url, backdrop_path, image_url, thumbnail_url, source_type, stream_url, video_url, view_count"
    );
  
    if (normalizedTargetIds.length) {
      moviesQuery = moviesQuery.in("id", normalizedTargetIds);
    }
  
    const { data: movieRows, error: movieError } = await moviesQuery;
    if (movieError) {
      throw new Error(movieError.message);
    }
  
    const movies = movieRows || [];
    const movieIds = movies.map((movie) => movie.id).filter(Boolean);
    if (!movieIds.length) return [];
  
    const [
      { data: sourceRows, error: sourceError },
      { data: movieGenreRows, error: movieGenreError },
      { data: genreRows, error: genreError },
      { data: countryRows, error: countryError },
      { data: contentControlRows, error: contentControlError },
    ] = await Promise.all([
      supabase
        .from("movie_sources")
        .select("movie_id, source_type, quality_label, is_active, object_key, public_url, video_url, mime_type")
        .in("movie_id", movieIds)
        .eq("is_active", true),
      supabase.from("movie_genres").select("movie_id, genre_id").in("movie_id", movieIds),
      supabase.from("genres").select("id, name"),
      supabase.from("countries").select("id, name, code"),
      supabase.from("content_controls").select("movie_id, is_hidden, is_blocked, is_premium").in("movie_id", movieIds),
    ]);
  
    if (sourceError) throw new Error(sourceError.message);
    if (movieGenreError) throw new Error(movieGenreError.message);
    if (genreError) throw new Error(genreError.message);
    if (countryError) throw new Error(countryError.message);
    if (contentControlError && contentControlError.code !== "PGRST116") {
      throw new Error(contentControlError.message);
    }
  
    const genreNameById = new Map((genreRows || []).map((genre) => [Number(genre.id), normalizeText(genre.name)]));
    const countryById = new Map(
      (countryRows || []).map((country) => [
        Number(country.id),
        {
          name: normalizeText(country.name) || normalizeText(country.code) || null,
          code: normalizeText(country.code) || null,
        },
      ])
    );
  
    const genreIdsByMovieId = new Map();
    for (const row of movieGenreRows || []) {
      const list = genreIdsByMovieId.get(row.movie_id) || [];
      list.push(Number(row.genre_id));
      genreIdsByMovieId.set(row.movie_id, list);
    }
  
    const sourcesByMovieId = new Map();
    for (const row of sourceRows || []) {
      const list = sourcesByMovieId.get(row.movie_id) || [];
      list.push(row);
      sourcesByMovieId.set(row.movie_id, list);
    }
  
    const contentControlByMovieId = new Map(
      (contentControlRows || []).map((row) => [Number(row.movie_id), row])
    );
  
    return movies
      .map((movie) => {
        const contentControl = contentControlByMovieId.get(Number(movie.id)) || null;
        const activeSources = sourcesByMovieId.get(movie.id) || [];
        const genres = (genreIdsByMovieId.get(movie.id) || [])
          .map((genreId) => genreNameById.get(Number(genreId)))
          .filter(Boolean);
        const country = countryById.get(Number(movie.country_id)) || { name: null, code: null };
        const isHidden = normalizeBoolean(contentControl?.is_hidden, false);
        const isBlocked = normalizeBoolean(contentControl?.is_blocked, false);
        const hasPlaySource = Boolean(
          movie.video_url ||
            movie.stream_url ||
            activeSources.some((source) => source.object_key || source.public_url || source.video_url)
        );
  
        return {
          ...movie,
          genres,
          country: country.name || normalizeText(movie.origin_country) || null,
          country_code: country.code || null,
          has_play_source: hasPlaySource,
          source_count: activeSources.length,
          is_hidden: isHidden,
          is_blocked: isBlocked,
          is_available_for_recommendation:
            movie.is_active !== false &&
            (movie.status || "active") === "active" &&
            !movie.deleted_at &&
            !isHidden &&
            !isBlocked &&
            hasPlaySource,
          search_title: buildMovieSearchableText(movie.title, movie.original_title),
          search_synopsis: buildMovieSearchableText(movie.description, movie.overview),
          search_tags: buildMovieSearchableText(
            genres.join(" "),
            country.name,
            movie.origin_country,
            movie.original_language,
            movie.type,
            movie.age_rating
          ),
          search_all: buildMovieSearchableText(
            movie.title,
            movie.original_title,
            movie.description,
            movie.overview,
            genres.join(" "),
            country.name,
            movie.origin_country,
            movie.original_language,
            movie.type,
            movie.age_rating
          ),
        };
      })
      .filter((movie) => movie.is_available_for_recommendation);
  };
  
  const scoreMovieAgainstBehaviorProfile = (movie, profile, options = {}) => {
    if (!movie?.is_available_for_recommendation) return null;
  
    let score = Number(options.baseScore) || 0;
    const reasons = Array.isArray(options.baseReasons) ? [...options.baseReasons] : [];
    const affinity = profile?.affinity || {};
  
    const addBoostFromMap = (weightMap, values, scale, reasonLabel) => {
      const total = (Array.isArray(values) ? values : [values]).reduce((sum, value) => {
        const key = normalizeBehaviorText(value);
        return sum + Number(weightMap?.[key] || 0);
      }, 0);
  
      if (total <= 0) return;
      score += Math.min(total / 5, 1) * scale;
      reasons.push(reasonLabel);
    };
  
    const directMovieWeight = Number(affinity.movieWeights?.[String(movie.id)] || 0);
    if (directMovieWeight > 0) {
      score += Math.min(directMovieWeight / 4.5, 1.35);
      reasons.push("behavior movie affinity");
    }
  
    addBoostFromMap(affinity.genreWeights, movie.genres || [], 0.72, "genre affinity");
    addBoostFromMap(
      affinity.countryWeights,
      [movie.country, movie.origin_country].filter(Boolean),
      0.42,
      "country affinity"
    );
    addBoostFromMap(affinity.languageWeights, movie.original_language, 0.28, "language affinity");
    addBoostFromMap(affinity.typeWeights, movie.type, 0.08, "type affinity");
  
    let keywordWeightTotal = 0;
    for (const [token, weight] of Object.entries(affinity.keywordWeights || {})) {
      if (!token || !Number.isFinite(weight) || weight <= 0) continue;
  
      if (movie.search_title.includes(token)) {
        keywordWeightTotal += weight * 1.3;
        continue;
      }
  
      if (movie.search_tags.includes(token)) {
        keywordWeightTotal += weight;
        continue;
      }
  
      if (movie.search_synopsis.includes(token) || movie.search_all.includes(token)) {
        keywordWeightTotal += weight * 0.78;
      }
    }
  
    if (keywordWeightTotal > 0) {
      score += Math.min(keywordWeightTotal / 7, 0.95);
      reasons.push("search intent match");
    }
  
    const averageRating = Math.max(
      Number(movie.average_rating) || 0,
      Number(movie.vote_average) || 0,
      Number(movie.rating) || 0
    );
    const totalRatings = Math.max(Number(movie.total_ratings) || 0, Number(movie.vote_count) || 0);
  
    if (averageRating >= 7) {
      score += Math.min((averageRating - 6.5) / 3, 0.22);
      reasons.push("rating quality");
    }
  
    if (totalRatings > 0) {
      score += Math.min(totalRatings / 3000, 0.12);
    }
  
    if ((Number(movie.view_count) || 0) > 0) {
      score += Math.min(Number(movie.view_count) / 20000, 0.12);
    }
  
    if (normalizeBoolean(movie.is_trending, false)) {
      score += 0.08;
      reasons.push("trending");
    }
  
    if (normalizeBoolean(movie.is_featured, false)) {
      score += 0.06;
      reasons.push("featured");
    }
  
    if (movie.has_play_source) {
      score += 0.08;
    }
  
    if ((Number(movie.source_count) || 0) > 1) {
      score += 0.03;
    }
  
    return {
      score: Number(score.toFixed(4)),
      reasons: uniqueBehaviorParts(reasons),
    };
  };
  
  const getBehaviorRecommendationMovies = async ({ profile, limit = 10, aiMovies = [], excludeMovieIds = [] }) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
    const catalog = await getRecommendationCatalog();
    if (!catalog.length) return [];
  
    const aiMovieById = new Map(
      (aiMovies || [])
        .map((movie) => [normalizeInteger(movie.movie_id), movie])
        .filter(([movieId]) => Number.isInteger(movieId) && movieId > 0)
    );
    const excludedMovieIds = new Set(
      Array.from(
        new Set(
          (excludeMovieIds || [])
            .map((movieId) => normalizeInteger(movieId))
            .filter((movieId) => Number.isInteger(movieId) && movieId > 0)
        )
      )
    );
  
    const rankedMovies = catalog
      .map((movie) => {
        if (excludedMovieIds.has(movie.id)) return null;
  
        const aiMovie = aiMovieById.get(movie.id) || null;
        const ranking = scoreMovieAgainstBehaviorProfile(movie, profile, {
          baseScore: aiMovie ? Number(aiMovie.score || 0) + 0.15 : 0,
          baseReasons: aiMovie?.reason ? [aiMovie.reason] : [],
        });
  
        if (!ranking || ranking.score <= 0) return null;
  
        return normalizeAiMovie(
          {
            ...movie,
            movie_id: movie.id,
            score: ranking.score,
            average_rating: movie.average_rating || movie.vote_average || movie.rating || 0,
            reason: ranking.reasons.join(", "),
            source: aiMovie ? aiMovie.source || "ai" : "behavior",
          },
          0
        );
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  
    if (rankedMovies.length >= safeLimit) {
      return rankedMovies.slice(0, safeLimit);
    }
  
    if (!excludedMovieIds.size) {
      return rankedMovies;
    }
  
    const fallbackFill = catalog
      .map((movie) => {
        if (excludedMovieIds.has(movie.id)) return null;
  
        const ranking = scoreMovieAgainstBehaviorProfile(movie, profile, { baseScore: 0 });
        if (!ranking || ranking.score <= 0) return null;
  
        return normalizeAiMovie(
          {
            ...movie,
            movie_id: movie.id,
            score: ranking.score,
            average_rating: movie.average_rating || movie.vote_average || movie.rating || 0,
            reason: ranking.reasons.join(", "),
            source: "behavior",
          },
          0
        );
      })
      .filter(Boolean)
      .filter((movie) => !rankedMovies.some((existing) => existing.movie_id === movie.movie_id))
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  
    return [...rankedMovies, ...fallbackFill].slice(0, safeLimit);
  };
  
  const buildMetadataTokenSet = (movie) =>
    new Set(
      tokenizeBehaviorText(
        [
          movie?.title,
          movie?.original_title,
          movie?.description,
          movie?.overview,
          ...(Array.isArray(movie?.genres) ? movie.genres : []),
          movie?.country,
          movie?.origin_country,
          movie?.original_language,
          movie?.type,
          movie?.age_rating,
        ]
          .filter(Boolean)
          .join(" "),
        48
      )
    );
  
  const getCollaborativeSimilarMovieWeights = async (targetMovieId) => {
    const normalizedMovieId = normalizeInteger(targetMovieId);
    if (!normalizedMovieId) return new Map();
  
    const [
      { data: targetWatchRows, error: targetWatchError },
      { data: targetFavoriteRows, error: targetFavoriteError },
      { data: targetRatingRows, error: targetRatingError },
      { data: targetClickRows, error: targetClickError },
      { data: targetSearchRows, error: targetSearchError },
      { data: targetAiRecommendationRows, error: targetAiRecommendationError },
    ] = await Promise.all([
      supabase
        .from("watch_history")
        .select("user_id, progress")
        .eq("movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
      supabase
        .from("favorites")
        .select("user_id")
        .eq("movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
      supabase
        .from("ratings")
        .select("user_id, rating")
        .eq("movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
      supabase
        .from("movie_click_logs")
        .select("user_id, rank_position")
        .eq("movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
      supabase
        .from("search_logs")
        .select("user_id")
        .eq("clicked_movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
      supabase
        .from("ai_recommendations")
        .select("user_id, score")
        .eq("movie_id", normalizedMovieId)
        .not("user_id", "is", null)
        .limit(120),
    ]);
  
    if (targetWatchError) throw new Error(targetWatchError.message);
    if (targetFavoriteError) throw new Error(targetFavoriteError.message);
    if (targetRatingError) throw new Error(targetRatingError.message);
    if (targetClickError && !isAnalyticsSchemaMissingError(targetClickError) && targetClickError.code !== "PGRST116") {
      throw new Error(targetClickError.message);
    }
    if (targetSearchError && !isAnalyticsSchemaMissingError(targetSearchError) && targetSearchError.code !== "PGRST116") {
      throw new Error(targetSearchError.message);
    }
    if (targetAiRecommendationError && targetAiRecommendationError.code !== "PGRST116") {
      throw new Error(targetAiRecommendationError.message);
    }
  
    const userWeightById = new Map();
    const addUserWeight = (userId, value) => {
      const normalizedUserId = normalizeText(userId);
      if (!normalizedUserId || !Number.isFinite(value) || value === 0) return;
      userWeightById.set(normalizedUserId, (userWeightById.get(normalizedUserId) || 0) + value);
    };
  
    for (const row of targetWatchRows || []) {
      const progress = Math.max(0, Math.min(Number(row.progress) || 0, 100));
      addUserWeight(row.user_id, 1 + progress / 100);
    }
  
    for (const row of targetFavoriteRows || []) {
      addUserWeight(row.user_id, 2.1);
    }
  
    for (const row of targetRatingRows || []) {
      const rating = Number(row.rating) || 0;
      addUserWeight(row.user_id, rating >= 4 ? 2 + rating / 5 : rating >= 3 ? 0.8 : 0.25);
    }
  
    for (const row of targetClickRows || []) {
      const rankPosition = Math.max(Number(row.rank_position) || 0, 0);
      addUserWeight(row.user_id, rankPosition > 0 ? Math.max(0.75 - (rankPosition - 1) * 0.05, 0.25) : 0.35);
    }
  
    for (const row of targetSearchRows || []) {
      addUserWeight(row.user_id, 0.65);
    }
  
    for (const row of targetAiRecommendationRows || []) {
      const score = Math.max(Number(row.score) || 0, 0);
      addUserWeight(row.user_id, 0.15 + Math.min(score, 1.5) * 0.08);
    }
  
    const userIds = [...userWeightById.keys()];
    if (!userIds.length) return new Map();
  
    const [
      { data: watchRows, error: watchError },
      { data: favoriteRows, error: favoriteError },
      { data: ratingRows, error: ratingError },
      { data: clickRows, error: clickError },
      { data: searchRows, error: searchError },
      { data: aiRecommendationRows, error: aiRecommendationError },
    ] = await Promise.all([
      supabase
        .from("watch_history")
        .select("user_id, movie_id, progress")
        .in("user_id", userIds)
        .neq("movie_id", normalizedMovieId)
        .limit(400),
      supabase
        .from("favorites")
        .select("user_id, movie_id")
        .in("user_id", userIds)
        .neq("movie_id", normalizedMovieId)
        .limit(400),
      supabase
        .from("ratings")
        .select("user_id, movie_id, rating")
        .in("user_id", userIds)
        .neq("movie_id", normalizedMovieId)
        .limit(400),
      supabase
        .from("movie_click_logs")
        .select("user_id, movie_id, rank_position")
        .in("user_id", userIds)
        .neq("movie_id", normalizedMovieId)
        .limit(400),
      supabase
        .from("search_logs")
        .select("user_id, clicked_movie_id")
        .in("user_id", userIds)
        .neq("clicked_movie_id", normalizedMovieId)
        .not("clicked_movie_id", "is", null)
        .limit(400),
      supabase
        .from("ai_recommendations")
        .select("user_id, movie_id, score")
        .in("user_id", userIds)
        .neq("movie_id", normalizedMovieId)
        .limit(400),
    ]);
  
    if (watchError) throw new Error(watchError.message);
    if (favoriteError) throw new Error(favoriteError.message);
    if (ratingError) throw new Error(ratingError.message);
    if (clickError && !isAnalyticsSchemaMissingError(clickError) && clickError.code !== "PGRST116") {
      throw new Error(clickError.message);
    }
    if (searchError && !isAnalyticsSchemaMissingError(searchError) && searchError.code !== "PGRST116") {
      throw new Error(searchError.message);
    }
    if (aiRecommendationError && aiRecommendationError.code !== "PGRST116") {
      throw new Error(aiRecommendationError.message);
    }
  
    const collaborativeWeights = new Map();
    const addMovieWeight = (movieId, value) => {
      const normalizedOtherMovieId = normalizeInteger(movieId);
      if (!normalizedOtherMovieId || normalizedOtherMovieId === normalizedMovieId || !Number.isFinite(value) || value === 0) {
        return;
      }
  
      collaborativeWeights.set(
        normalizedOtherMovieId,
        (collaborativeWeights.get(normalizedOtherMovieId) || 0) + value
      );
    };
  
    for (const row of watchRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      const progress = Math.max(0, Math.min(Number(row.progress) || 0, 100));
      addMovieWeight(row.movie_id, userWeight * (0.6 + progress / 140));
    }
  
    for (const row of favoriteRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      addMovieWeight(row.movie_id, userWeight * 1.1);
    }
  
    for (const row of ratingRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      const rating = Number(row.rating) || 0;
      addMovieWeight(row.movie_id, userWeight * (rating >= 4 ? 1 + rating / 8 : rating >= 3 ? 0.4 : 0.1));
    }
  
    for (const row of clickRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      const rankPosition = Math.max(Number(row.rank_position) || 0, 0);
      addMovieWeight(row.movie_id, userWeight * (rankPosition > 0 ? Math.max(0.4 - (rankPosition - 1) * 0.03, 0.12) : 0.18));
    }
  
    for (const row of searchRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      addMovieWeight(row.clicked_movie_id, userWeight * 0.45);
    }
  
    for (const row of aiRecommendationRows || []) {
      const userWeight = userWeightById.get(normalizeText(row.user_id)) || 0;
      const score = Math.max(Number(row.score) || 0, 0);
      addMovieWeight(row.movie_id, userWeight * (0.08 + Math.min(score, 1.5) * 0.05));
    }
  
    return collaborativeWeights;
  };
  
  const buildSimilarMovieProfile = async (movieId, catalog) => {
    const normalizedMovieId = normalizeInteger(movieId);
    if (!normalizedMovieId) {
      const err = new Error("movieId khong hop le");
      err.statusCode = 400;
      throw err;
    }
  
    const targetMovie = (catalog || []).find((movie) => movie.id === normalizedMovieId);
    if (!targetMovie) {
      const existingMovie = await getMovieById(normalizedMovieId).catch(() => null);
      const err = new Error(
        existingMovie
          ? "Phim nay khong du dieu kien de goi y similar (inactive, deleted hoac chua co source phat)."
          : "Khong tim thay phim."
      );
      err.statusCode = existingMovie ? 400 : 404;
      throw err;
    }
  
    const keywordWeights = new Map();
    const addMovieKeywords = (value, baseWeight) => {
      tokenizeBehaviorText(value, 24).forEach((token, index) => {
        addWeightedValue(keywordWeights, token, Math.max(baseWeight - index * 0.08, 0.1), normalizeBehaviorText);
      });
    };
  
    addMovieKeywords(targetMovie.title, 1.5);
    addMovieKeywords(targetMovie.original_title, 1.2);
    addMovieKeywords(targetMovie.description, 0.65);
    addMovieKeywords(targetMovie.overview, 0.85);
  
    const genreWeights = new Map();
    for (const genre of targetMovie.genres || []) {
      addWeightedValue(genreWeights, genre, 2.2, normalizeBehaviorText);
    }
  
    const countryWeights = new Map();
    addWeightedValue(countryWeights, targetMovie.country, 1.4, normalizeBehaviorText);
    addWeightedValue(countryWeights, targetMovie.origin_country, 1.1, normalizeBehaviorText);
  
    const languageWeights = new Map();
    addWeightedValue(languageWeights, targetMovie.original_language, 1.2, normalizeBehaviorText);
  
    const typeWeights = new Map();
    addWeightedValue(typeWeights, targetMovie.type, 0.9, normalizeBehaviorText);
  
    const collaborativeWeights = await getCollaborativeSimilarMovieWeights(normalizedMovieId);
  
    return {
      targetMovie,
      collaborativeWeights,
      metadataTokens: buildMetadataTokenSet(targetMovie),
      profile: {
        affinity: {
          keywordWeights: mapToObject(keywordWeights, normalizeBehaviorText),
          genreWeights: mapToObject(genreWeights, normalizeBehaviorText),
          countryWeights: mapToObject(countryWeights, normalizeBehaviorText),
          languageWeights: mapToObject(languageWeights, normalizeBehaviorText),
          typeWeights: mapToObject(typeWeights, normalizeBehaviorText),
          movieWeights: mapToObject(collaborativeWeights, (value) => String(Number(value))),
        },
      },
    };
  };
  
  const normalizeSimilarityReasonTag = (reason) => {
    const normalized = normalizeBehaviorText(reason);
    if (normalized === "genre affinity") return "same_genre";
    if (normalized === "country affinity") return "same_country";
    if (normalized === "language affinity") return "same_language";
    if (normalized === "type affinity") return "same_type";
    if (normalized === "search intent match") return "metadata_overlap";
    if (normalized === "behavior movie affinity") return "behavior_overlap";
    if (normalized === "rating quality") return "well_rated";
    if (normalized === "trending") return "trending";
    if (normalized === "featured") return "featured";
    if (normalized === "playable") return "playable";
    return normalized.replace(/\s+/g, "_");
  };
  
  const scoreSimilarMovieCandidate = ({ targetMovie, candidateMovie, similarProfile }) => {
    if (!candidateMovie?.is_available_for_recommendation || candidateMovie.id === targetMovie.id) {
      return null;
    }
  
    const baseRanking = scoreMovieAgainstBehaviorProfile(candidateMovie, similarProfile.profile, { baseScore: 0 });
    if (!baseRanking) return null;
  
    let rawScore = baseRanking.score;
    const reasonTags = new Set(
      (baseRanking.reasons || [])
        .map((reason) => normalizeSimilarityReasonTag(reason))
        .filter(Boolean)
    );
  
    const targetGenres = new Set((targetMovie.genres || []).map((genre) => normalizeBehaviorText(genre)));
    const candidateGenres = new Set((candidateMovie.genres || []).map((genre) => normalizeBehaviorText(genre)));
    const sharedGenres = [...targetGenres].filter((genre) => candidateGenres.has(genre));
    if (sharedGenres.length) {
      rawScore += Math.min(sharedGenres.length * 0.24, 0.54);
      reasonTags.add("same_genre");
    }
  
    if (
      normalizeBehaviorText(targetMovie.original_language) &&
      normalizeBehaviorText(targetMovie.original_language) === normalizeBehaviorText(candidateMovie.original_language)
    ) {
      rawScore += 0.18;
      reasonTags.add("same_language");
    }
  
    const targetCountryValues = new Set(
      [targetMovie.country, targetMovie.origin_country].map((value) => normalizeBehaviorText(value)).filter(Boolean)
    );
    const candidateCountryValues = new Set(
      [candidateMovie.country, candidateMovie.origin_country].map((value) => normalizeBehaviorText(value)).filter(Boolean)
    );
    if ([...targetCountryValues].some((country) => candidateCountryValues.has(country))) {
      rawScore += 0.14;
      reasonTags.add("same_country");
    }
  
    if (
      normalizeBehaviorText(targetMovie.type) &&
      normalizeBehaviorText(targetMovie.type) === normalizeBehaviorText(candidateMovie.type)
    ) {
      rawScore += 0.08;
      reasonTags.add("same_type");
    }
  
    const targetYear = normalizeInteger(targetMovie.release_year);
    const candidateYear = normalizeInteger(candidateMovie.release_year);
    if (targetYear && candidateYear) {
      const yearDiff = Math.abs(targetYear - candidateYear);
      if (yearDiff === 0) {
        rawScore += 0.12;
        reasonTags.add("close_release_year");
      } else if (yearDiff <= 2) {
        rawScore += 0.08;
        reasonTags.add("close_release_year");
      } else if (yearDiff <= 5) {
        rawScore += 0.04;
        reasonTags.add("close_release_year");
      }
    }
  
    const targetRuntime = normalizeInteger(targetMovie.runtime_minutes || targetMovie.duration);
    const candidateRuntime = normalizeInteger(candidateMovie.runtime_minutes || candidateMovie.duration);
    if (targetRuntime && candidateRuntime) {
      const runtimeDiff = Math.abs(targetRuntime - candidateRuntime);
      if (runtimeDiff <= 10) {
        rawScore += 0.06;
        reasonTags.add("similar_runtime");
      } else if (runtimeDiff <= 20) {
        rawScore += 0.03;
        reasonTags.add("similar_runtime");
      }
    }
  
    if (
      normalizeBehaviorText(targetMovie.age_rating) &&
      normalizeBehaviorText(targetMovie.age_rating) === normalizeBehaviorText(candidateMovie.age_rating)
    ) {
      rawScore += 0.04;
      reasonTags.add("same_age_rating");
    }
  
    const candidateTokens = buildMetadataTokenSet(candidateMovie);
    const sharedTokens = [...similarProfile.metadataTokens].filter((token) => candidateTokens.has(token));
    if (sharedTokens.length) {
      const overlapRatio = sharedTokens.length / Math.max(similarProfile.metadataTokens.size, candidateTokens.size, 1);
      rawScore += Math.min(overlapRatio * 1.4, 0.22);
      reasonTags.add("metadata_overlap");
    }
  
    if (similarProfile.collaborativeWeights.get(candidateMovie.id)) {
      reasonTags.add("behavior_overlap");
    }
  
    if (candidateMovie.has_play_source) {
      reasonTags.add("playable");
    }
  
    const similarityScore = Number((1 - Math.exp(-Math.max(rawScore, 0))).toFixed(4));
    return {
      rawScore,
      similarityScore,
      reasonTags: [...reasonTags].slice(0, 6),
    };
  };
  
  const CHAT_GENRE_RULES = [
    { tag: "action", label: "Action", aliases: ["action", "hanh dong", "hành động"] },
    { tag: "adventure", label: "Adventure", aliases: ["adventure", "phieu luu", "phiêu lưu"] },
    { tag: "animation", label: "Animation", aliases: ["animation", "anime", "hoat hinh", "hoạt hình"] },
    { tag: "comedy", label: "Comedy", aliases: ["comedy", "hai", "hài", "hai huoc", "hài hước"] },
    { tag: "crime", label: "Crime", aliases: ["crime", "toi pham", "tội phạm"] },
    { tag: "documentary", label: "Documentary", aliases: ["documentary", "tai lieu", "tài liệu"] },
    { tag: "drama", label: "Drama", aliases: ["drama", "tam ly", "tâm lý", "chinh kich", "chính kịch"] },
    { tag: "family", label: "Family", aliases: ["family", "gia dinh", "gia đình"] },
    { tag: "fantasy", label: "Fantasy", aliases: ["fantasy", "ky ao", "kỳ ảo"] },
    { tag: "horror", label: "Horror", aliases: ["horror", "kinh di", "kinh dị"] },
    { tag: "mystery", label: "Mystery", aliases: ["mystery", "bi an", "bí ẩn"] },
    { tag: "romance", label: "Romance", aliases: ["romance", "tinh cam", "tình cảm", "lang man", "lãng mạn"] },
    {
      tag: "science_fiction",
      label: "Science Fiction",
      aliases: ["science fiction", "sci fi", "sci-fi", "vien tuong", "viễn tưởng", "khoa hoc vien tuong"],
    },
    { tag: "thriller", label: "Thriller", aliases: ["thriller", "giat gan", "giật gân"] },
  ];
  
  const CHAT_REGION_RULES = [
    {
      tag: "korean",
      label: "Korean",
      aliases: ["han quoc", "hàn quốc", "korean", "korea", "south korea"],
      countryAliases: ["han quoc", "hàn quốc", "korea", "south korea"],
      languageAliases: ["ko", "korean"],
    },
    {
      tag: "japanese",
      label: "Japanese",
      aliases: ["nhat", "nhật", "nhat ban", "nhật bản", "japanese", "japan"],
      countryAliases: ["nhat ban", "nhật bản", "japan"],
      languageAliases: ["ja", "japanese"],
    },
    {
      tag: "chinese",
      label: "Chinese",
      aliases: ["trung quoc", "trung quốc", "china", "chinese"],
      countryAliases: ["trung quoc", "trung quốc", "china", "hong kong", "taiwan"],
      languageAliases: ["zh", "cn", "chinese"],
    },
    {
      tag: "american",
      label: "American",
      aliases: ["my", "mỹ", "american", "usa", "us", "united states"],
      countryAliases: ["usa", "us", "united states", "my", "mỹ", "america"],
      languageAliases: ["en", "english"],
    },
    {
      tag: "vietnamese",
      label: "Vietnamese",
      aliases: ["viet nam", "việt nam", "vietnamese", "phim viet", "phim việt"],
      countryAliases: ["viet nam", "việt nam", "vietnam"],
      languageAliases: ["vi", "vietnamese"],
    },
    {
      tag: "thai",
      label: "Thai",
      aliases: ["thai", "thailand", "thai lan", "thái lan"],
      countryAliases: ["thai", "thailand", "thai lan", "thái lan"],
      languageAliases: ["th", "thai"],
    },
  ];
  
  const CHAT_TYPE_RULES = [
    { tag: "series", aliases: ["series", "tv", "tv show", "bo", "bộ", "anime bo", "phim bo", "phim bộ"] },
    { tag: "single", aliases: ["single", "movie", "phim le", "phim lẻ", "feature film"] },
  ];
  
  const CHAT_MOOD_RULES = [
    { tag: "sad", aliases: ["buon", "buồn", "sad", "heartbreak", "melancholy", "tearjerker", "emotional"] },
    { tag: "light", aliases: ["nhe nhang", "nhẹ nhàng", "feel good", "healing", "relaxing", "thu gian", "thư giãn"] },
    { tag: "weekend", aliases: ["cuoi tuan", "cuối tuần", "weekend"] },
    { tag: "funny", aliases: ["vui", "funny", "hai", "hài"] },
    { tag: "adventure", aliases: ["phieu luu", "phiêu lưu", "adventure"] },
  ];
  
  const CHAT_SIMILAR_MARKERS = [
    "giong",
    "giống",
    "tuong tu",
    "tương tự",
    "nhu",
    "như",
    "same as",
    "like",
  ];
  
  const CHAT_IGNORE_QUERY_TOKENS = new Set(["giong", "tuong", "nhu", "same", "like"]);
  
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  const hasBehaviorAliasMatch = (value, aliases = []) => {
    const normalizedValue = normalizeBehaviorText(value);
    if (!normalizedValue) return false;
  
    return aliases.some((alias) => {
      const normalizedAlias = normalizeBehaviorText(alias);
      if (!normalizedAlias) return false;
  
      if (normalizedAlias.length <= 3) {
        return new RegExp(`(^|\\s)${escapeRegExp(normalizedAlias)}(?=\\s|$)`).test(normalizedValue);
      }
  
      return normalizedValue.includes(normalizedAlias);
    });
  };
  
  const resolveChatReasonLabel = (reasonTag) => {
    const normalized = normalizeBehaviorText(reasonTag);
    if (normalized === "same genre") return "cung the loai";
    if (normalized === "same language") return "cung ngon ngu";
    if (normalized === "same country") return "cung quoc gia";
    if (normalized === "same type") return "cung dinh dang";
    if (normalized === "year match" || normalized === "close release year") return "gan nam phat hanh";
    if (normalized === "metadata overlap") return "noi dung gan nhau";
    if (normalized === "theme match") return "dung mood chu de";
    if (normalized === "behavior affinity") return "hop voi lich su cua ban";
    if (normalized === "behavior overlap") return "nguoi xem gan giong cung chon";
    if (normalized === "high rating" || normalized === "well rated" || normalized === "rating quality") {
      return "duoc danh gia tot";
    }
    if (normalized === "featured") return "noi bat trong thu vien";
    if (normalized === "trending") return "dang duoc quan tam";
    if (normalized === "playable") return "co the xem ngay";
    if (normalized === "similar to current" || normalized === "similar to reference") return "giong phim tham chieu";
    if (normalized === "search intent match" || normalized === "query match" || normalized === "title match") {
      return "hop voi yeu cau cua ban";
    }
    return normalizeText(reasonTag) || "phu hop";
  };
  
  const buildChatReasonText = (reasonTags = []) => {
    const labels = Array.from(new Set((reasonTags || []).map(resolveChatReasonLabel).filter(Boolean))).slice(0, 3);
    if (!labels.length) return "Phu hop voi yeu cau xem phim cua ban.";
    return `Phu hop vi ${labels.join(", ")}.`;
  };
  
  const buildChatResponseMovie = (movie, { score = 0, source = "chat", reasonTags = [] } = {}) =>
    normalizeAiMovie(
      {
        ...movie,
        movie_id: movie.id,
        score,
        average_rating: movie.average_rating || movie.vote_average || movie.rating || 0,
        reason: buildChatReasonText(reasonTags),
        reason_tags: Array.from(new Set(reasonTags)).filter(Boolean).slice(0, 6),
        source,
        source_type: movie.source_type || null,
        has_play_source: Boolean(movie.has_play_source),
      },
      0
    );
  
  const getCatalogFallbackMovies = async ({ limit = 10, profile = null, excludeMovieIds = [] } = {}) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
    const catalog = await getRecommendationCatalog();
    const excluded = new Set(
      (excludeMovieIds || [])
        .map((movieId) => normalizeInteger(movieId))
        .filter((movieId) => Number.isInteger(movieId) && movieId > 0)
    );
  
    return catalog
      .map((movie) => {
        if (excluded.has(movie.id)) return null;
  
        const reasonTags = ["playable"];
        let score = 0.1;
  
        if (profile?.hasSignals) {
          const behaviorRanking = scoreMovieAgainstBehaviorProfile(movie, profile, { baseScore: 0.1 });
          if (behaviorRanking) {
            score = behaviorRanking.score;
            behaviorRanking.reasons.forEach((reason) => reasonTags.push(normalizeSimilarityReasonTag(reason)));
          }
        } else {
          const averageRating = Math.max(
            Number(movie.average_rating) || 0,
            Number(movie.vote_average) || 0,
            Number(movie.rating) || 0
          );
  
          if (averageRating >= 7) {
            score += Math.min((averageRating - 6.5) / 2.5, 0.45);
            reasonTags.push("high_rating");
          }
  
          if (normalizeBoolean(movie.is_trending, false)) {
            score += 0.18;
            reasonTags.push("trending");
          }
  
          if (normalizeBoolean(movie.is_featured, false)) {
            score += 0.12;
            reasonTags.push("featured");
          }
  
          if ((Number(movie.view_count) || 0) > 0) {
            score += Math.min(Number(movie.view_count) / 25000, 0.2);
          }
        }
  
        return buildChatResponseMovie(movie, {
          score,
          source: profile?.hasSignals ? "chat_behavior" : "fallback",
          reasonTags,
        });
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, safeLimit);
  };
  
  const extractSimilarReferenceText = (...values) => {
    const patterns = [
      /\b(?:giong|tuong tu|nhu)\s+(?:phim\s+)?(.+)$/,
      /\b(?:movie like|same as)\s+(.+)$/,
    ];
  
    for (const value of values) {
      const normalizedValue = normalizeBehaviorText(value);
      if (!normalizedValue) continue;
  
      for (const pattern of patterns) {
        const match = normalizedValue.match(pattern);
        if (!match?.[1]) continue;
        const referenceText = match[1]
          .replace(/\b(toi|vua|moi|da|dang|xem)\b/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (referenceText) return referenceText;
      }
    }
  
    return null;
  };
  
  const findCatalogMovieByLooseTitle = (referenceText, catalog = []) => {
    const normalizedReference = normalizeBehaviorText(referenceText);
    if (!normalizedReference) return null;
  
    const referenceTokens = tokenizeBehaviorText(normalizedReference, 10);
    let bestMatch = null;
  
    for (const movie of catalog) {
      const titleText = normalizeBehaviorText([movie.title, movie.original_title].filter(Boolean).join(" "));
      if (!titleText) continue;
  
      let score = 0;
      if (titleText === normalizedReference) score += 5.5;
      if (titleText.includes(normalizedReference)) score += 4.5;
  
      const sharedTokens = referenceTokens.filter((token) => titleText.includes(token));
      score += sharedTokens.length * 0.85;
      if (referenceTokens.length > 0 && sharedTokens.length === referenceTokens.length) {
        score += 1.4;
      }
  
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { movie, score };
      }
    }
  
    return bestMatch && bestMatch.score >= 2.4 ? bestMatch.movie : null;
  };
  
  const buildChatQueryIntent = ({
    query,
    normalizedQuery,
    detectedFilters = {},
    catalog = [],
    currentMovieId = null,
    profile = null,
  }) => {
    const combinedText = [query, normalizedQuery].filter(Boolean).join(" ");
    const normalizedCombined = normalizeBehaviorText(combinedText);
  
    const detectedGenreText = [
      ...(Array.isArray(detectedFilters?.genres) ? detectedFilters.genres : []),
      detectedFilters?.genre,
    ]
      .filter(Boolean)
      .join(" ");
    const detectedCountryText = [detectedFilters?.country, detectedFilters?.language, detectedFilters?.languages]
      .flat()
      .filter(Boolean)
      .join(" ");
  
    const genreRules = CHAT_GENRE_RULES.filter((rule) =>
      hasBehaviorAliasMatch(`${combinedText} ${detectedGenreText}`, [rule.label, rule.tag, ...rule.aliases])
    );
    const regionRules = CHAT_REGION_RULES.filter((rule) =>
      hasBehaviorAliasMatch(`${combinedText} ${detectedCountryText}`, [rule.label, rule.tag, ...rule.aliases])
    );
    const typeRule =
      CHAT_TYPE_RULES.find((rule) => hasBehaviorAliasMatch(combinedText, [rule.tag, ...rule.aliases])) || null;
    const moodRules = CHAT_MOOD_RULES.filter((rule) =>
      hasBehaviorAliasMatch(combinedText, [rule.tag, ...rule.aliases])
    );
  
    const yearMatch = `${combinedText} ${detectedFilters?.year || ""}`.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : normalizeInteger(detectedFilters?.year);
    const wantsHighRating =
      hasBehaviorAliasMatch(combinedText, ["hay", "best", "rating cao", "high rating", "danh gia cao", "đánh giá cao"]) ||
      normalizeBoolean(detectedFilters?.wants_high_rating, false);
    const wantsTrending =
      hasBehaviorAliasMatch(combinedText, ["hot", "trending", "pho bien", "phổ biến", "noi bat", "nổi bật"]) ||
      normalizeBoolean(detectedFilters?.top_current, false);
    const isSimilarIntent =
      Boolean(currentMovieId) ||
      hasBehaviorAliasMatch(normalizedCombined, CHAT_SIMILAR_MARKERS) ||
      hasBehaviorAliasMatch(normalizedCombined, ["vua xem", "vừa xem", "moi xem", "mới xem"]);
  
    const explicitReferenceText = extractSimilarReferenceText(query, normalizedQuery);
    const currentMovie =
      currentMovieId && Array.isArray(catalog)
        ? catalog.find((movie) => movie.id === normalizeInteger(currentMovieId)) || null
        : null;
    let referenceMovie = currentMovie || null;
  
    if (!referenceMovie && explicitReferenceText) {
      referenceMovie = findCatalogMovieByLooseTitle(explicitReferenceText, catalog);
    }
  
    if (!referenceMovie && isSimilarIntent && Array.isArray(profile?.seedMovieIds) && profile.seedMovieIds.length) {
      referenceMovie =
        catalog.find((movie) => movie.id === normalizeInteger(profile.seedMovieIds[0])) || null;
    }
  
    const queryTokens = tokenizeBehaviorText(combinedText, 24).filter((token) => !CHAT_IGNORE_QUERY_TOKENS.has(token));
    const referenceTokens = new Set(tokenizeBehaviorText(referenceMovie?.title || referenceMovie?.original_title, 10));
  
    return {
      normalizedQuery: sanitizeFreeText(normalizedQuery || query, 240) || sanitizeFreeText(query, 240) || "",
      queryTokens: queryTokens.filter((token) => !referenceTokens.has(token)),
      genreRules,
      regionRules,
      typeRule,
      moodRules,
      year,
      wantsHighRating,
      wantsTrending,
      isSimilarIntent,
      referenceMovie,
      currentMovie,
    };
  };
  
  const buildChatDetectedFilters = (intent) => ({
    genres: intent.genreRules.map((rule) => rule.label),
    regions: intent.regionRules.map((rule) => rule.label),
    type: intent.typeRule?.tag || null,
    moods: intent.moodRules.map((rule) => rule.tag),
    year: intent.year || null,
    wants_high_rating: intent.wantsHighRating,
    wants_trending: intent.wantsTrending,
    current_movie_id: intent.currentMovie?.id || null,
    similar_to_movie_id: intent.referenceMovie?.id || null,
    similar_to_title: intent.referenceMovie?.title || null,
  });
  
  const buildChatExplanation = ({ intent, profile, source, itemCount }) => {
    if (source === "fallback") {
      return `Chua tim thay phim khop sat yeu cau trong thu vien luc nay. He thong dang uu tien ${itemCount} phim noi bo co the xem ngay de ban tiep tuc kham pha.`;
    }
  
    const explanationBits = [];
  
    if (intent.genreRules.length) {
      explanationBits.push(`khop the loai ${intent.genreRules.slice(0, 2).map((rule) => rule.label).join(", ")}`);
    }
    if (intent.regionRules.length) {
      explanationBits.push(`uu tien ${intent.regionRules.slice(0, 1).map((rule) => rule.label).join(", ")}`);
    }
    if (intent.year) {
      explanationBits.push(`gan nam ${intent.year}`);
    }
    if (intent.referenceMovie) {
      explanationBits.push(`blend do tuong tu voi ${intent.referenceMovie.title}`);
    }
    if (profile?.hasSignals) {
      explanationBits.push("rerank theo lich su tim kiem, click, xem va danh gia cua ban");
    }
  
    if (!explanationBits.length) {
      explanationBits.push("uu tien phim co that trong thu vien va co the xem ngay");
    }
  
    return `${source === "fallback" ? "Tam thoi hien phim noi bo manh nhat." : "Da tim thay goi y tu catalog noi bo."} ${explanationBits.join(", ")}. Hien co ${itemCount} phim phu hop nhat.`;
  };
  
  const persistChatRecommendationLogs = async ({
    userId,
    query,
    normalizedQuery,
    explanation,
    movies,
    source,
  }) => {
    const normalizedUserId = normalizeText(userId);
    if (!normalizedUserId) return;
  
    const movieIds = (movies || [])
      .map((movie) => normalizeInteger(movie.movie_id || movie.id))
      .filter((movieId) => Number.isInteger(movieId) && movieId > 0);
  
    try {
      const { error } = await supabase.from("ai_chat_history").insert({
        user_id: normalizedUserId,
        message: sanitizeFreeText(query, 240) || "",
        response: sanitizeFreeText(`${normalizedQuery || query} | ${explanation || ""}`, 500),
        recommended_movies: movieIds,
      });
      if (error) throw error;
    } catch (error) {
      console.warn("[AI CHAT HISTORY] Optional insert failed:", error?.message || error);
    }
  
    if (!movieIds.length) return;
  
    try {
      const { error } = await supabase.from("ai_recommendations").insert(
        (movies || [])
          .map((movie) => {
            const movieId = normalizeInteger(movie.movie_id || movie.id);
            if (!movieId) return null;
  
            return {
              user_id: normalizedUserId,
              movie_id: movieId,
              reason: sanitizeFreeText(
                Array.isArray(movie.reason_tags) && movie.reason_tags.length
                  ? movie.reason_tags.join(", ")
                  : movie.reason || "",
                240
              ),
              score: normalizeNumber(movie.score) || 0,
              source: sanitizeFreeText(source, 120) || "chat",
            };
          })
          .filter(Boolean)
      );
      if (error) throw error;
    } catch (error) {
      console.warn("[AI RECOMMENDATIONS] Optional insert failed:", error?.message || error);
    }
  };
  
  const getChatRecommendationMovies = async ({ query, userId = null, currentMovieId = null, limit = 10 }) => {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
  
    const aiBlendPromise = callAiRecommendationService({
      query,
      topN: Math.min(safeLimit * 3, 18),
      userId: null,
    }).catch(() => null);
    const profilePromise = userId ? buildBehaviorProfileQuery(userId).catch(() => null) : Promise.resolve(null);
    const catalogPromise = getRecommendationCatalog();
  
    const [aiBlendResult, profile, catalog] = await Promise.all([aiBlendPromise, profilePromise, catalogPromise]);
    const aiMovies = aiBlendResult?.movies || [];
    const aiPayload = aiBlendResult?.payload || {};
    const intent = buildChatQueryIntent({
      query,
      normalizedQuery: aiPayload.normalized_query || query,
      detectedFilters: aiPayload.detected_filters || {},
      catalog,
      currentMovieId,
      profile,
    });
    const similarProfile = intent.referenceMovie
      ? await buildSimilarMovieProfile(intent.referenceMovie.id, catalog).catch(() => null)
      : null;
    const aiMovieById = new Map(
      aiMovies
        .map((movie) => [normalizeInteger(movie.movie_id), movie])
        .filter(([movieId]) => Number.isInteger(movieId) && movieId > 0)
    );
  
    const rankedMovies = catalog
      .map((movie) => {
        if (!movie?.is_available_for_recommendation) return null;
        if (intent.referenceMovie?.id && movie.id === intent.referenceMovie.id) return null;
  
        const reasonTags = new Set(["playable"]);
        let score = 0;
        let explicitFilterMatches = 0;
  
        const aiMovie = aiMovieById.get(movie.id) || null;
        if (aiMovie) {
          score += 0.45 + Math.min(Math.max(Number(aiMovie.score) || 0, 0), 2.6) * 0.42;
          reasonTags.add("query_match");
        }
  
        if (profile?.hasSignals) {
          const behaviorRanking = scoreMovieAgainstBehaviorProfile(movie, profile, { baseScore: 0 });
          if (behaviorRanking?.score) {
            score += behaviorRanking.score * 0.42;
            behaviorRanking.reasons.forEach((reason) => reasonTags.add(normalizeSimilarityReasonTag(reason)));
            reasonTags.add("behavior_affinity");
          }
        }
  
        if (similarProfile) {
          const similarRanking = scoreSimilarMovieCandidate({
            targetMovie: similarProfile.targetMovie,
            candidateMovie: movie,
            similarProfile,
          });
  
          if (similarRanking?.similarityScore) {
            score += similarRanking.similarityScore * (intent.isSimilarIntent ? 1.85 : 0.8);
            similarRanking.reasonTags.forEach((reasonTag) => reasonTags.add(reasonTag));
            reasonTags.add(intent.currentMovie?.id ? "similar_to_current" : "similar_to_reference");
            explicitFilterMatches += 1;
          }
        }
  
        const titleMatches = intent.queryTokens.filter((token) => movie.search_title.includes(token));
        const tagMatches = intent.queryTokens.filter(
          (token) => !titleMatches.includes(token) && movie.search_tags.includes(token)
        );
        const synopsisMatches = intent.queryTokens.filter(
          (token) =>
            !titleMatches.includes(token) &&
            !tagMatches.includes(token) &&
            (movie.search_synopsis.includes(token) || movie.search_all.includes(token))
        );
  
        if (titleMatches.length) {
          score += Math.min(titleMatches.length * 0.26, 0.9);
          reasonTags.add("title_match");
        }
  
        if (tagMatches.length) {
          score += Math.min(tagMatches.length * 0.18, 0.7);
          reasonTags.add("metadata_overlap");
        }
  
        if (synopsisMatches.length) {
          score += Math.min(synopsisMatches.length * 0.12, 0.5);
          reasonTags.add("theme_match");
        }
  
        if (intent.genreRules.length) {
          const matchedGenres = intent.genreRules.filter((rule) =>
            hasBehaviorAliasMatch(movie.search_tags, [rule.label, rule.tag, ...rule.aliases])
          );
          if (matchedGenres.length) {
            score += 0.95 + Math.min((matchedGenres.length - 1) * 0.18, 0.28);
            reasonTags.add("same_genre");
            explicitFilterMatches += matchedGenres.length;
          } else {
            score -= 0.45;
          }
        }
  
        if (intent.regionRules.length) {
          const matchedRegions = intent.regionRules.filter(
            (rule) =>
              hasBehaviorAliasMatch([movie.country, movie.origin_country].filter(Boolean).join(" "), rule.countryAliases) ||
              hasBehaviorAliasMatch(movie.original_language, rule.languageAliases)
          );
  
          if (matchedRegions.length) {
            score += 0.62;
            reasonTags.add("same_language");
            explicitFilterMatches += matchedRegions.length;
          } else {
            score -= 0.28;
          }
        }
  
        if (intent.typeRule) {
          if (hasBehaviorAliasMatch(movie.type, [intent.typeRule.tag, ...intent.typeRule.aliases])) {
            score += 0.18;
            reasonTags.add("same_type");
            explicitFilterMatches += 1;
          } else {
            score -= 0.12;
          }
        }
  
        if (intent.year) {
          const candidateYear = normalizeInteger(movie.release_year);
          if (candidateYear === intent.year) {
            score += 0.82;
            reasonTags.add("year_match");
            explicitFilterMatches += 1;
          } else if (candidateYear && Math.abs(candidateYear - intent.year) <= 1) {
            score += 0.38;
            reasonTags.add("close_release_year");
          } else {
            score -= 0.42;
          }
        }
  
        if (intent.moodRules.length) {
          const matchedMoods = intent.moodRules.filter((rule) =>
            hasBehaviorAliasMatch([movie.search_synopsis, movie.search_tags].join(" "), [rule.tag, ...rule.aliases])
          );
          if (matchedMoods.length) {
            score += 0.26;
            reasonTags.add("theme_match");
          }
        }
  
        const averageRating = Math.max(
          Number(movie.average_rating) || 0,
          Number(movie.vote_average) || 0,
          Number(movie.rating) || 0
        );
  
        if (intent.wantsHighRating && averageRating >= 7) {
          score += 0.22;
          reasonTags.add("high_rating");
          explicitFilterMatches += 1;
        }
  
        if (intent.wantsTrending && normalizeBoolean(movie.is_trending, false)) {
          score += 0.18;
          reasonTags.add("trending");
        }
  
        if (normalizeBoolean(movie.is_featured, false)) {
          score += 0.06;
          reasonTags.add("featured");
        }
  
        if (
          score <= 0 ||
          (
            (intent.genreRules.length || intent.regionRules.length || intent.typeRule || intent.year || intent.isSimilarIntent) &&
            explicitFilterMatches <= 0 &&
            !aiMovie &&
            !titleMatches.length &&
            !tagMatches.length &&
            !synopsisMatches.length
          )
        ) {
          return null;
        }
  
        return buildChatResponseMovie(movie, {
          score: Number(score.toFixed(4)),
          source: profile?.hasSignals ? "chat_behavior" : "chat",
          reasonTags: [...reasonTags],
        });
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, safeLimit);
  
    const primaryItems = rankedMovies.length
      ? rankedMovies
      : await getCatalogFallbackMovies({
          limit: safeLimit,
          profile,
          excludeMovieIds: intent.referenceMovie?.id ? [intent.referenceMovie.id] : [],
        });
    const hybridResult = await mergeHybridRecommendationItems({
      items: primaryItems,
      query,
      limit: safeLimit,
      catalog,
    });
    const source = hybridResult.hasTmdbFallback
      ? "hybrid"
      : rankedMovies.length
        ? (profile?.hasSignals ? "chat_behavior" : "chat")
        : "fallback";
    const warning = hybridResult.hasTmdbFallback
      ? "Một số gợi ý được bổ sung từ TMDB để danh sách phong phú hơn."
      : rankedMovies.length
      ? ""
      : "Chua tim thay phim khop sat trong thu vien, dang uu tien cac phim noi bo co the xem ngay.";
    const explanation = buildChatExplanation({
      intent,
      profile,
      source,
      itemCount: hybridResult.items.length,
    });
  
    return {
      source,
      normalizedQuery: intent.normalizedQuery,
      detectedFilters: {
        ...(aiPayload.detected_filters || {}),
        ...buildChatDetectedFilters(intent),
      },
      warning,
      explanation,
      items: hybridResult.items,
      profile,
    };
  };
  
  
  return {
    assertMovieSourcesR2Columns,
    assertVideoQualitiesR2Columns,
    buildAdminMoviePayload,
    buildBehaviorProfileQuery,
    buildChatQueryIntent,
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
    getCollaborativeSimilarMovieWeights,
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
    scoreMovieAgainstBehaviorProfile,
    scoreSimilarMovieCandidate,
    syncMovieGenres,
    updateMoviePlaybackFields,
  };
};

