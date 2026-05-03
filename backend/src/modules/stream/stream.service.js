import { SIGNED_STREAM_TTL_SECONDS } from "../../shared/constants.js";
import { normalizeBoolean, normalizeInteger, normalizeText } from "../../shared/normalize.js";
import { supabase } from "../../shared/supabaseClient.js";

const DEMO_DISABLE_SUBSCRIPTION_GATING = true;

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

const pickBestQualityRow = (rows) => {
  const getQualityScore = (qualityLabel) => {
    const label = (normalizeText(qualityLabel) || "").toLowerCase();
    if (label.includes("2160") || label.includes("4k")) return 2160;
    if (label.includes("1440")) return 1440;
    if (label.includes("1080")) return 1080;
    if (label.includes("720")) return 720;
    if (label.includes("480")) return 480;
    if (label.includes("360")) return 360;
    return 0;
  };

  return [...(rows || [])].sort((left, right) => getQualityScore(right.quality) - getQualityScore(left.quality))[0] || null;
};

const hasPlayableSourceReference = (sourceRow) =>
  Boolean(normalizeText(sourceRow?.video_url) || normalizeText(sourceRow?.public_url) || normalizeText(sourceRow?.object_key));

const getContentControlForMovie = async (movieId) => {
  const { data, error } = await supabase
    .from("content_controls")
    .select("movie_id, is_hidden, is_featured, is_premium, is_blocked, note")
    .eq("movie_id", movieId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.warn("[CONTENT CONTROL]", error.message);
    return null;
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

const getMovieByLookup = async (identifier, lookup = "tmdb") => {
  const parsedIdentifier = normalizeInteger(identifier);
  if (!parsedIdentifier) {
    const err = new Error("movie identifier khÃ´ng há»£p lá»‡");
    err.statusCode = 400;
    throw err;
  }

  const column = lookup === "id" ? "id" : "tmdb_id";
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq(column, parsedIdentifier)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const err = new Error(column === "id" ? "KhÃ´ng tÃ¬m tháº¥y phim theo movieId" : "Phim nÃ y chÆ°a Ä‘Æ°á»£c map trong báº£ng movies");
    err.statusCode = 404;
    throw err;
  }

  return data;
};

export const createStreamService = ({ resolveObjectUrl }) => {
  const resolvePlaybackUrlFromSource = async (sourceRow) => {
    if (!sourceRow) return null;

    const directUrl = normalizeText(sourceRow.video_url);
    if (directUrl) return directUrl;

    return resolveObjectUrl({
      objectKey: sourceRow.object_key,
      publicUrl: sourceRow.public_url,
      expiresIn: SIGNED_STREAM_TTL_SECONDS,
    });
  };

  const resolveMoviePlayback = async ({
    identifier,
    lookup = "tmdb",
    episodeId = null,
    userId = null,
    skipPremiumCheck = false,
  }) => {
    const movie = await getMovieByLookup(identifier, lookup);
    const contentControl = await getContentControlForMovie(movie.id);

    const movieStatus = (normalizeText(movie.status) || "").toLowerCase();
    if (movie.is_active === false || (movieStatus && movieStatus !== "active")) {
      const err = new Error("Phim nÃ y Ä‘ang bá»‹ áº©n hoáº·c bá»‹ khÃ³a");
      err.statusCode = 403;
      throw err;
    }

    if (contentControl?.is_hidden || contentControl?.is_blocked) {
      const err = new Error("Phim nÃ y Ä‘ang bá»‹ áº©n hoáº·c bá»‹ khÃ³a");
      err.statusCode = 403;
      throw err;
    }

    const requiresPremium =
      !DEMO_DISABLE_SUBSCRIPTION_GATING &&
      (normalizeBoolean(contentControl?.is_premium, false) || normalizeBoolean(movie.is_premium, false));
    if (requiresPremium && !skipPremiumCheck) {
      const hasSubscription = await hasActiveSubscription(userId);
      if (!hasSubscription) {
        const err = new Error("Phim nÃ y yÃªu cáº§u gÃ³i premium Ä‘ang hoáº¡t Ä‘á»™ng");
        err.statusCode = 402;
        throw err;
      }
    }

    let episode = null;
    let source = null;

    if (episodeId) {
      episode = await getEpisodeById(episodeId);

      if (Number(episode.movie_id) !== Number(movie.id)) {
        const err = new Error("episodeId khÃ´ng thuá»™c movieId Ä‘Ã£ chá»n");
        err.statusCode = 400;
        throw err;
      }

      const { data: qualityRows, error: qualitiesError } = await supabase
        .from("video_qualities")
        .select("*")
        .eq("episode_id", episode.id);

      if (qualitiesError) {
        throw new Error(qualitiesError.message);
      }

      const qualityRow = pickBestQualityRow((qualityRows || []).filter(hasPlayableSourceReference));
      if (qualityRow) {
        source = {
          ...qualityRow,
          source_type: normalizePlayableSourceType(
            movie.source_type,
            resolveSourceTypeFromUrl(qualityRow.video_url || qualityRow.public_url, "direct")
          ),
          quality_label: qualityRow.quality,
        };
      } else if (normalizeText(episode.video_url)) {
        source = {
          source_type: resolveSourceTypeFromUrl(episode.video_url, normalizePlayableSourceType(movie.source_type, "direct")),
          video_url: episode.video_url,
          quality_label: "source",
          mime_type: inferMimeTypeFromUrl(episode.video_url),
        };
      }
    }

    if (!source) {
      const { data: sourceRows, error: sourceError } = await supabase
        .from("movie_sources")
        .select("*")
        .eq("movie_id", movie.id)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(10);

      if (sourceError) {
        throw new Error(sourceError.message);
      }

      source = (sourceRows || []).find(hasPlayableSourceReference) || null;
    }

    if (!source && (movie.stream_url || movie.video_url)) {
      source = {
        source_type: normalizePlayableSourceType(movie.source_type, resolveSourceTypeFromUrl(movie.stream_url || movie.video_url, "direct")),
        video_url: movie.stream_url || movie.video_url,
        quality_label: null,
        mime_type: inferMimeTypeFromUrl(movie.stream_url || movie.video_url),
      };
    }

    if (!source) {
      const err = new Error("Phim nÃ y chÆ°a cÃ³ nguá»“n phÃ¡t. HÃ£y gáº¯n source trong Admin.");
      err.statusCode = 404;
      throw err;
    }

    let sourceType = normalizePlayableSourceType(source.source_type, "direct");
    const playbackUrl = await resolvePlaybackUrlFromSource(source);

    if (!normalizeText(playbackUrl)) {
      const err = new Error("KhÃ´ng thá»ƒ táº¡o URL phÃ¡t cho nguá»“n phim nÃ y");
      err.statusCode = 404;
      throw err;
    }

    sourceType = normalizePlayableSourceType(source.source_type, resolveSourceTypeFromUrl(playbackUrl, "direct"));

    return {
      movie,
      episode,
      contentControl,
      source: {
        ...source,
        source_type: sourceType,
        url: playbackUrl,
        mime_type:
          normalizeText(source.mime_type) ||
          inferMimeTypeFromUrl(playbackUrl) ||
          (sourceType === "hls" ? "application/vnd.apple.mpegurl" : "video/mp4"),
        quality_label: normalizeText(source.quality_label) || normalizeText(source.quality) || null,
        is_hls: sourceType === "hls" || isHlsUrl(playbackUrl),
      },
    };
  };

  const getMovieSourceByTmdbId = async (tmdbId, options = {}) => {
    const result = await resolveMoviePlayback({
      identifier: tmdbId,
      lookup: "tmdb",
      skipPremiumCheck: true,
      ...options,
    });

    return {
      movie: result.movie,
      source: result.source,
    };
  };

  return {
    getMovieSourceByTmdbId,
    resolveMoviePlayback,
  };
};
