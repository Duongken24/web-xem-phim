import { normalizeInteger, normalizeText } from "../../shared/normalize.js";

export const createAdminStorageService = ({
  assertMovieSourcesR2Columns,
  assertVideoQualitiesR2Columns,
  buildStorageObjectKey,
  createEpisodeVideoQuality,
  createMovieSource,
  deleteObject,
  getEpisodeById,
  getMovieById,
  getStorageConfigSummary,
  isStorageConfigured,
  normalizePlayableSourceType,
  resolveSourceTypeFromUrl,
  supabase,
  testStorageConnection,
  updateMoviePlaybackFields,
  uploadObject,
}) => ({
  async getStorageHealth() {
    return testStorageConnection();
  },

  async createSource(movieId, body, userId) {
    const movie = await getMovieById(movieId);

    return createMovieSource({
      movieId: movie.id,
      sourceType: body.source_type,
      videoUrl: body.video_url,
      qualityLabel: body.quality_label,
      isPrimary: body.is_primary,
      isActive: body.is_active,
      storageProvider: body.storage_provider,
      objectKey: body.object_key,
      publicUrl: body.public_url,
      mimeType: body.mime_type,
      fileSize: body.file_size,
      duration: body.duration,
      width: body.width,
      height: body.height,
      uploadedBy: userId,
    });
  },

  async createEpisode(movieId, body) {
    const movie = await getMovieById(movieId);

    const episodeNumber = normalizeInteger(body.episode_number);
    if (!episodeNumber) {
      const err = new Error("episode_number báº¯t buá»™c");
      err.statusCode = 400;
      throw err;
    }

    const { data: episode, error } = await supabase
      .from("episodes")
      .insert({
        movie_id: movie.id,
        episode_number: episodeNumber,
        title: normalizeText(body.title) || `Episode ${episodeNumber}`,
        description: normalizeText(body.description),
        video_url: normalizeText(body.video_url) || "",
        duration: normalizeInteger(body.duration),
        thumbnail_url: normalizeText(body.thumbnail_url),
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return episode;
  },

  async uploadMovieVideo({ movieId, file, body, userId }) {
    const movie = await getMovieById(movieId);

    if (!file) {
      const err = new Error("Thiáº¿u file video");
      err.statusCode = 400;
      throw err;
    }

    if (!isStorageConfigured()) {
      const err = new Error("Storage chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh Ä‘áº§y Ä‘á»§ trong backend/.env");
      err.statusCode = 400;
      throw err;
    }

    const episodeId = normalizeInteger(body?.episode_id);
    let episode = null;
    if (episodeId) {
      episode = await getEpisodeById(episodeId);
      if (Number(episode.movie_id) !== Number(movie.id)) {
        const err = new Error("episode_id khÃ´ng thuá»™c movieId Ä‘Ã£ chá»n");
        err.statusCode = 400;
        throw err;
      }
    }

    if (episode) {
      await assertVideoQualitiesR2Columns();
    } else {
      await assertMovieSourcesR2Columns();
    }

    const qualityLabel = normalizeText(body?.quality_label) || "original";
    const sourceType = normalizePlayableSourceType(
      body?.source_type,
      getStorageConfigSummary().provider || resolveSourceTypeFromUrl(file.originalname, "direct")
    );
    const objectKey = buildStorageObjectKey({
      movieId: movie.id,
      episodeId: episode?.id,
      qualityLabel,
      originalName: file.originalname,
      kind: "video",
    });

    const uploadResult = await uploadObject({
      body: file.buffer,
      key: objectKey,
      contentType: file.mimetype,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        movieId: String(movie.id),
        episodeId: episode?.id ? String(episode.id) : "",
        quality: qualityLabel,
      },
    });

    if (episode) {
      const quality = await createEpisodeVideoQuality({
        episodeId: episode.id,
        quality: qualityLabel,
        videoUrl: uploadResult.url,
        storageProvider: getStorageConfigSummary().provider,
        objectKey: uploadResult.objectKey,
        publicUrl: uploadResult.publicUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

      return {
        success: true,
        movie_id: movie.id,
        upload: uploadResult,
        quality,
        url: uploadResult.url,
        object_key: uploadResult.objectKey,
      };
    }

    const source = await createMovieSource({
      movieId: movie.id,
      sourceType,
      qualityLabel,
      isPrimary: body?.is_primary,
      isActive: body?.is_active,
      storageProvider: getStorageConfigSummary().provider,
      objectKey: uploadResult.objectKey,
      publicUrl: uploadResult.publicUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: userId,
      playbackUrl: uploadResult.url,
    });

    return {
      success: true,
      movie_id: movie.id,
      upload: uploadResult,
      source,
      url: uploadResult.url,
      object_key: uploadResult.objectKey,
    };
  },

  async deleteSource(sourceId) {
    const { data: source, error } = await supabase
      .from("movie_sources")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!source) {
      const err = new Error("KhÃ´ng tÃ¬m tháº¥y source");
      err.statusCode = 404;
      throw err;
    }

    if (source.object_key && isStorageConfigured()) {
      try {
        await deleteObject(source.object_key);
      } catch (storageError) {
        console.warn("[DELETE SOURCE] Storage delete warning:", storageError.message);
      }
    }

    const { error: deleteRowError } = await supabase.from("movie_sources").delete().eq("id", source.id);
    if (deleteRowError) throw new Error(deleteRowError.message);

    if (source.is_primary) {
      const { data: nextSource } = await supabase
        .from("movie_sources")
        .select("*")
        .eq("movie_id", source.movie_id)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (nextSource) {
        await updateMoviePlaybackFields(source.movie_id, nextSource);
      }
    }
  },

  async uploadEpisodeVideo({ episodeId, file, body }) {
    const episode = await getEpisodeById(episodeId);

    if (!file) {
      const err = new Error("ThiÃ¡ÂºÂ¿u file video");
      err.statusCode = 400;
      throw err;
    }

    if (!isStorageConfigured()) {
      const err = new Error("Storage chÃ†Â°a Ã„â€˜Ã†Â°Ã¡Â»Â£c cÃ¡ÂºÂ¥u hÃƒÂ¬nh Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§ trong backend/.env");
      err.statusCode = 400;
      throw err;
    }

    const movie = await getMovieById(episode.movie_id);
    await assertVideoQualitiesR2Columns();

    const qualityLabel = normalizeText(body?.quality_label) || "original";
    const objectKey = buildStorageObjectKey({
      movieId: movie.id,
      episodeId: episode.id,
      qualityLabel,
      originalName: file.originalname,
      kind: "video",
    });

    const uploadResult = await uploadObject({
      body: file.buffer,
      key: objectKey,
      contentType: file.mimetype,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        movieId: String(movie.id),
        episodeId: String(episode.id),
        quality: qualityLabel,
      },
    });

    const quality = await createEpisodeVideoQuality({
      episodeId: episode.id,
      quality: qualityLabel,
      videoUrl: uploadResult.url,
      storageProvider: getStorageConfigSummary().provider,
      objectKey: uploadResult.objectKey,
      publicUrl: uploadResult.publicUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return {
      success: true,
      upload: uploadResult,
      quality,
      url: uploadResult.url,
      object_key: uploadResult.objectKey,
    };
  },
});
