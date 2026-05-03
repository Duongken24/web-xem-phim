export const mapMovieWithPlaySource = (movie, source) => ({
  ...movie,
  has_play_source: Boolean(source?.video_url || source?.object_key || source?.public_url),
});
