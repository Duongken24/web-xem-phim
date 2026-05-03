import { normalizeInteger, normalizeText } from "../../shared/normalize.js";

const buildStreamPayload = (playback) => {
  const playbackUrl = normalizeText(playback?.source?.url);
  if (!playbackUrl) {
    const err = new Error("Phim chưa có nguồn phát hợp lệ.");
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    movie_id: playback.movie.id,
    episode_id: playback.episode?.id || null,
    source_type: playback.source.source_type,
    sourceType: playback.source.source_type,
    url: playbackUrl,
    object_key: playback.source.object_key || null,
    mime_type: playback.source.mime_type,
    quality_label: playback.source.quality_label,
    is_hls: playback.source.is_hls,
    poster: playback.movie.poster_url || playback.movie.poster_path || playback.movie.thumbnail_url || null,
    title: playback.movie.title,
    movie: {
      id: playback.movie.id,
      tmdb_id: playback.movie.tmdb_id,
      title: playback.movie.title,
      video_url: playback.movie.video_url || null,
    },
  };
};

export const createStreamController = ({ service, getUserFromToken }) => ({
  async streamByTmdbId(req, res) {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ success: false, error: "ChÆ°a Ä‘Äƒng nháº­p" });

      const playback = await service.resolveMoviePlayback({
        identifier: req.params.tmdbId,
        lookup: req.query.lookup === "id" ? "id" : "tmdb",
        episodeId: normalizeInteger(req.query.episodeId),
        userId: user.id,
      });

      return res.json(buildStreamPayload(playback));
    } catch (err) {
      console.error("âŒ Lá»–I /api/stream:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "Lá»—i há»‡ thá»‘ng" });
    }
  },

  async streamByMovieId(req, res) {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ success: false, error: "ChÆ°a Ä‘Äƒng nháº­p" });

      const playback = await service.resolveMoviePlayback({
        identifier: req.params.movieId,
        lookup: "id",
        episodeId: normalizeInteger(req.query.episodeId),
        userId: user.id,
      });

      return res.json(buildStreamPayload(playback));
    } catch (err) {
      console.error("âŒ Lá»–I /api/stream/movie:", err.message);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || "Lá»—i há»‡ thá»‘ng" });
    }
  },
});
