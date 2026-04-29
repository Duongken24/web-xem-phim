import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout';
import {
  deleteAdminMovie,
  getAdminMovies,
  getAdminMoviesMeta,
  getAdminStorageHealth,
  upsertAdminMovie,
  uploadAdminMovieVideo,
  type AdminCountry,
  type AdminGenre,
  type AdminMovie,
  type AdminStorageHealth,
} from '../services/admin.service';

type MovieFormState = {
  editingId: number | null;
  title: string;
  originalTitle: string;
  slug: string;
  type: string;
  status: string;
  isActive: boolean;
  isPremium: boolean;
  description: string;
  overview: string;
  trailerUrl: string;
  posterUrl: string;
  posterPath: string;
  backdropUrl: string;
  backdropPath: string;
  imageUrl: string;
  thumbnailUrl: string;
  releaseDate: string;
  releaseYear: string;
  duration: string;
  runtimeMinutes: string;
  ageRating: string;
  originalLanguage: string;
  originCountry: string;
  countryId: string;
  voteAverage: string;
  voteCount: string;
  rating: string;
  averageRating: string;
  totalRatings: string;
  viewCount: string;
  isFeatured: boolean;
  isTrending: boolean;
  tmdbId: string;
  imdbId: string;
  genreIds: number[];
};

type MetadataSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

const emptyForm: MovieFormState = {
  editingId: null,
  title: '',
  originalTitle: '',
  slug: '',
  type: 'single',
  status: 'active',
  isActive: true,
  isPremium: false,
  description: '',
  overview: '',
  trailerUrl: '',
  posterUrl: '',
  posterPath: '',
  backdropUrl: '',
  backdropPath: '',
  imageUrl: '',
  thumbnailUrl: '',
  releaseDate: '',
  releaseYear: '',
  duration: '',
  runtimeMinutes: '',
  ageRating: '',
  originalLanguage: '',
  originCountry: '',
  countryId: '',
  voteAverage: '',
  voteCount: '',
  rating: '',
  averageRating: '',
  totalRatings: '',
  viewCount: '',
  isFeatured: false,
  isTrending: false,
  tmdbId: '',
  imdbId: '',
  genreIds: [],
};

const inputClassName =
  'w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500';
const textAreaClassName = `${inputClassName} min-h-[120px] resize-y`;
const selectClassName = `${inputClassName} pr-10`;
const checkboxCardClassName =
  'flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white';

const normalizeText = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeInteger = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatValue = (value: unknown) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

const getMoviePoster = (
  movie: Pick<AdminMovie, 'poster_url' | 'poster_path' | 'image_url' | 'thumbnail_url'>
) => {
  const poster = [movie.poster_url, movie.poster_path, movie.image_url, movie.thumbnail_url]
    .map((value) => value?.trim())
    .find(Boolean);

  return poster || '/fallback-poster.svg';
};

const getSourceType = () => 'r2';

const getInternalMovieId = (movie: Pick<AdminMovie, 'id'> | null | undefined) => {
  const parsed = Number(movie?.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const movieToForm = (movie: AdminMovie): MovieFormState => ({
  editingId: getInternalMovieId(movie),
  title: movie.title || '',
  originalTitle: movie.original_title || '',
  slug: movie.slug || '',
  type: movie.type || 'single',
  status: movie.status || 'active',
  isActive: movie.is_active !== false,
  isPremium: movie.is_premium === true,
  description: movie.description || '',
  overview: movie.overview || '',
  trailerUrl: movie.trailer_url || '',
  posterUrl: movie.poster_url || '',
  posterPath: movie.poster_path || '',
  backdropUrl: movie.backdrop_url || '',
  backdropPath: movie.backdrop_path || '',
  imageUrl: movie.image_url || '',
  thumbnailUrl: movie.thumbnail_url || '',
  releaseDate: movie.release_date || '',
  releaseYear: formatValue(movie.release_year),
  duration: formatValue(movie.duration),
  runtimeMinutes: formatValue(movie.runtime_minutes),
  ageRating: movie.age_rating || '',
  originalLanguage: movie.original_language || '',
  originCountry: movie.origin_country || '',
  countryId: formatValue(movie.country_id),
  voteAverage: formatValue(movie.vote_average),
  voteCount: formatValue(movie.vote_count),
  rating: formatValue(movie.rating),
  averageRating: formatValue(movie.average_rating),
  totalRatings: formatValue(movie.total_ratings),
  viewCount: formatValue(movie.view_count),
  isFeatured: movie.is_featured === true,
  isTrending: movie.is_trending === true,
  tmdbId: formatValue(movie.tmdb_id),
  imdbId: movie.imdb_id || '',
  genreIds: Array.isArray(movie.genres)
    ? movie.genres
        .map((genreId) => Number(genreId))
        .filter((genreId) => Number.isInteger(genreId) && genreId > 0)
    : [],
});

function MetadataSection({ title, description, children }: MetadataSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-base font-semibold text-white">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [genres, setGenres] = useState<AdminGenre[]>([]);
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [form, setForm] = useState<MovieFormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingMovieId, setDeletingMovieId] = useState<number | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadQuality, setUploadQuality] = useState('1080p');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [metadataError, setMetadataError] = useState('');
  const [storageHealth, setStorageHealth] = useState<AdminStorageHealth | null>(null);
  const [storageHealthError, setStorageHealthError] = useState('');

  const filteredMovies = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return movies;

    return movies.filter((movie) => {
      const haystack = [
        movie.title,
        movie.original_title,
        movie.slug,
        String(movie.id),
        movie.imdb_id,
        String(movie.tmdb_id ?? ''),
        movie.source_type,
        movie.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [movies, search]);

  const currentMovieId =
    form.editingId && Number.isInteger(Number(form.editingId)) && Number(form.editingId) > 0
      ? Number(form.editingId)
      : null;
  const isStorageReady = storageHealth?.ok === true;
  const uploadDisabled = !currentMovieId || !uploadFile || uploading || !isStorageReady;
  const uploadButtonLabel = uploading
    ? 'Dang upload len R2...'
    : !currentMovieId
      ? 'Luu phim truoc khi upload'
      : !uploadFile
        ? 'Chon file de upload'
        : !isStorageReady
          ? 'Storage R2 chua san sang'
          : 'Upload video R2';
  const selectedGenres = useMemo(
    () => genres.filter((genre) => form.genreIds.includes(genre.id)),
    [genres, form.genreIds]
  );

  const loadMovies = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await getAdminMovies();
      setMovies(payload.movies || []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai danh sach phim.');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    setMetadataLoading(true);

    try {
      const payload = await getAdminMoviesMeta();
      setGenres(payload.genres || []);
      setCountries(payload.countries || []);
      setMetadataError('');
    } catch (error) {
      setMetadataError(error instanceof Error ? error.message : 'Khong the tai genres/countries.');
    } finally {
      setMetadataLoading(false);
    }
  };

  const loadStorageHealth = async () => {
    try {
      const health = await getAdminStorageHealth();
      setStorageHealth(health.storage);
      setStorageHealthError(health.storage?.ok ? '' : health.storage?.error || 'Cloudflare R2 chua san sang.');
      return health.storage;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Khong the kiem tra Cloudflare R2.';
      setStorageHealth(null);
      setStorageHealthError(message);
      return null;
    }
  };

  useEffect(() => {
    void loadMovies();
    void loadMetadata();
    void loadStorageHealth();
  }, []);

  const toggleGenre = (genreId: number) => {
    setForm((prev) => ({
      ...prev,
      genreIds: prev.genreIds.includes(genreId)
        ? prev.genreIds.filter((item) => item !== genreId)
        : [...prev.genreIds, genreId],
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = normalizeText(form.title) || normalizeText(form.originalTitle);
    if (!title) {
      setErrorMessage('Title bat buoc.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        movie_id: form.editingId,
        title,
        original_title: normalizeText(form.originalTitle),
        slug: normalizeText(form.slug),
        type: normalizeText(form.type) || 'single',
        status: normalizeText(form.status) || 'active',
        is_active: form.isActive,
        is_premium: form.isPremium,
        description: normalizeText(form.description),
        overview: normalizeText(form.overview),
        trailer_url: normalizeText(form.trailerUrl),
        poster_url: normalizeText(form.posterUrl),
        poster_path: normalizeText(form.posterPath),
        backdrop_url: normalizeText(form.backdropUrl),
        backdrop_path: normalizeText(form.backdropPath),
        image_url: normalizeText(form.imageUrl),
        thumbnail_url: normalizeText(form.thumbnailUrl),
        release_date: normalizeText(form.releaseDate),
        release_year: normalizeInteger(form.releaseYear),
        duration: normalizeInteger(form.duration),
        runtime_minutes: normalizeInteger(form.runtimeMinutes),
        age_rating: normalizeText(form.ageRating),
        original_language: normalizeText(form.originalLanguage),
        origin_country: normalizeText(form.originCountry),
        country_id: normalizeInteger(form.countryId),
        vote_average: normalizeNumber(form.voteAverage),
        vote_count: normalizeInteger(form.voteCount),
        rating: normalizeNumber(form.rating),
        average_rating: normalizeNumber(form.averageRating),
        total_ratings: normalizeInteger(form.totalRatings),
        view_count: normalizeInteger(form.viewCount),
        is_featured: form.isFeatured,
        is_trending: form.isTrending,
        tmdb_id: normalizeInteger(form.tmdbId),
        imdb_id: normalizeText(form.imdbId),
        genres: form.genreIds,
        source_type: getSourceType(),
      };

      const result = await upsertAdminMovie(payload);
      const savedMovieId = getInternalMovieId(result.movie);
      if (!savedMovieId) {
        throw new Error('Backend da luu phim nhung khong tra ve movie.id noi bo.');
      }

      setForm(movieToForm({ ...result.movie, id: savedMovieId, genres: form.genreIds }));
      setSuccessMessage(
        `${result.action === 'updated' ? 'Da cap nhat phim.' : 'Da them phim moi.'} Movie ID hien tai: #${savedMovieId}.`
      );
      await loadMovies();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the luu phim.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (movie: AdminMovie) => {
    const movieId = getInternalMovieId(movie);
    if (!movieId) {
      setErrorMessage('Phim nay chua co movie.id noi bo nen chua the upload R2.');
      return;
    }

    setForm(movieToForm({ ...movie, id: movieId }));
    setUploadFile(null);
    setUploadQuality('1080p');
    setErrorMessage('');
    setSuccessMessage(`Dang sua phim #${movieId}: ${movie.title}. Co the chon file de upload R2.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setForm(emptyForm);
    setUploadFile(null);
    setUploadQuality('1080p');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleDeleteMovie = async (movie: AdminMovie) => {
    const movieId = getInternalMovieId(movie);
    if (!movieId) {
      setErrorMessage('Khong tim thay movie.id noi bo de xoa.');
      return;
    }

    if ((movie.status || '').toLowerCase() === 'deleted') {
      setErrorMessage(`Phim #${movieId} da o trang thai deleted.`);
      return;
    }

    const confirmed = window.confirm(
      `Ban co chac muon xoa phim "${movie.title}" khong? Phim se bi an khoi he thong nguoi dung.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingMovieId(movieId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await deleteAdminMovie(movieId);
      await loadMovies();

      if (form.editingId === movieId) {
        handleReset();
      }

      setSuccessMessage(
        `Da xoa mem phim #${result.movie_id}. Phim da bi an khoi he thong nguoi dung va giu lai de co the khoi phuc sau.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the xoa phim.');
    } finally {
      setDeletingMovieId(null);
    }
  };

  const handleUploadVideo = async () => {
    if (!currentMovieId) {
      setErrorMessage('Hay luu phim truoc de co movie_id noi bo, sau do moi upload video.');
      return;
    }

    if (!uploadFile) {
      setErrorMessage('Hay chon file video de upload.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const health = await loadStorageHealth();
      if (!health?.ok) {
        const missing = health?.missingConfigKeys?.length ? ` Thieu: ${health.missingConfigKeys.join(', ')}.` : '';
        throw new Error(`Cloudflare R2 chua san sang.${missing}`);
      }

      const result = await uploadAdminMovieVideo(currentMovieId, uploadFile, {
        qualityLabel: normalizeText(uploadQuality) || 'original',
        isPrimary: true,
        isActive: true,
      });

      setUploadFile(null);
      setSuccessMessage(
        `Da upload R2 movie_id #${currentMovieId}: ${result.upload.objectKey}${result.upload.url ? ` | URL: ${result.upload.url}` : ``}`
      );
      await loadMovies();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the upload video len R2.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Admin Movies</div>
              <h2 className="mt-3 text-3xl font-bold text-white">Quan ly phim noi bo</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Quan ly movie metadata theo huong TMDB-like, nhung van van hanh bang movie_id noi bo va upload
                video len Cloudflare R2.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Flow chinh: luu phim - giu movie_id - upload video len R2 theo movie_id.
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_1.32fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {form.editingId ? `Cap nhat phim #${form.editingId}` : 'Them phim moi'}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Form metadata rong hon, nhung movie_id noi bo va flow upload R2 van duoc giu nguyen.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Lam moi
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Movie ID</div>
                <div className="mt-2 text-lg font-semibold text-white">{currentMovieId ? `#${currentMovieId}` : 'Chua co'}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Genres da chon</div>
                <div className="mt-2 text-lg font-semibold text-white">{form.genreIds.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Source type</div>
                <div className="mt-2 text-lg font-semibold text-white">{getSourceType()}</div>
              </div>
            </div>

            {metadataError ? (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Metadata lookup gap: {metadataError}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <MetadataSection title="Nhom A - Thong tin co ban" description="Thong tin van hanh chinh cua movie noi bo.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Title *</span>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Title"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Original title</span>
                    <input
                      value={form.originalTitle}
                      onChange={(event) => setForm((prev) => ({ ...prev, originalTitle: event.target.value }))}
                      placeholder="Original title"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Slug</span>
                    <input
                      value={form.slug}
                      onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                      placeholder="De trong de backend auto-generate"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Type</span>
                    <select
                      value={form.type}
                      onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                      className={selectClassName}
                    >
                      <option value="single">single</option>
                      <option value="series">series</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Status</span>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      className={selectClassName}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="deleted">deleted</option>
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={checkboxCardClassName}>
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                      />
                      is_active
                    </label>
                    <label className={checkboxCardClassName}>
                      <input
                        type="checkbox"
                        checked={form.isPremium}
                        onChange={(event) => setForm((prev) => ({ ...prev, isPremium: event.target.checked }))}
                      />
                      is_premium
                    </label>
                  </div>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom B - Mo ta" description="Description ngan, overview dai, va trailer url.">
                <div className="space-y-4">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Description ngan"
                      className={textAreaClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Overview</span>
                    <textarea
                      value={form.overview}
                      onChange={(event) => setForm((prev) => ({ ...prev, overview: event.target.value }))}
                      placeholder="Overview chi tiet"
                      className={textAreaClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Trailer URL</span>
                    <input
                      value={form.trailerUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, trailerUrl: event.target.value }))}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </label>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom C - Hinh anh" description="Duong dan URL day du va path metadata phu.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Poster URL</span>
                    <input
                      value={form.posterUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, posterUrl: event.target.value }))}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Poster path</span>
                    <input
                      value={form.posterPath}
                      onChange={(event) => setForm((prev) => ({ ...prev, posterPath: event.target.value }))}
                      placeholder="/poster-path.jpg"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Backdrop URL</span>
                    <input
                      value={form.backdropUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, backdropUrl: event.target.value }))}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Backdrop path</span>
                    <input
                      value={form.backdropPath}
                      onChange={(event) => setForm((prev) => ({ ...prev, backdropPath: event.target.value }))}
                      placeholder="/backdrop-path.jpg"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Image URL</span>
                    <input
                      value={form.imageUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Thumbnail URL</span>
                    <input
                      value={form.thumbnailUrl}
                      onChange={(event) => setForm((prev) => ({ ...prev, thumbnailUrl: event.target.value }))}
                      placeholder="https://..."
                      className={inputClassName}
                    />
                  </label>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom D - Thoi gian / Thoi luong" description="Nam phat hanh, ngay, duration, runtime va age rating.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Release year</span>
                    <input
                      value={form.releaseYear}
                      onChange={(event) => setForm((prev) => ({ ...prev, releaseYear: event.target.value }))}
                      placeholder="2026"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Release date</span>
                    <input
                      value={form.releaseDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, releaseDate: event.target.value }))}
                      placeholder="YYYY-MM-DD"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Duration</span>
                    <input
                      value={form.duration}
                      onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                      placeholder="So phut / tong duration"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Runtime minutes</span>
                    <input
                      value={form.runtimeMinutes}
                      onChange={(event) => setForm((prev) => ({ ...prev, runtimeMinutes: event.target.value }))}
                      placeholder="120"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                    <span>Age rating</span>
                    <input
                      value={form.ageRating}
                      onChange={(event) => setForm((prev) => ({ ...prev, ageRating: event.target.value }))}
                      placeholder="13+, PG-13, T18..."
                      className={inputClassName}
                    />
                  </label>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom E - Ngon ngu / Quoc gia" description="Country selector dung country_id, con origin_country va language la metadata tu do.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Original language</span>
                    <input
                      value={form.originalLanguage}
                      onChange={(event) => setForm((prev) => ({ ...prev, originalLanguage: event.target.value }))}
                      placeholder="vi, en, ko..."
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Origin country</span>
                    <input
                      value={form.originCountry}
                      onChange={(event) => setForm((prev) => ({ ...prev, originCountry: event.target.value }))}
                      placeholder="VN, US, KR..."
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                    <span>Country selector (country_id)</span>
                    <select
                      value={form.countryId}
                      onChange={(event) => setForm((prev) => ({ ...prev, countryId: event.target.value }))}
                      className={selectClassName}
                    >
                      <option value="">Khong chon country_id</option>
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name} ({country.code || `ID ${country.id}`})
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-500">
                      {metadataLoading ? 'Dang tai countries...' : `${countries.length} country options`}
                    </div>
                  </label>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom F - Danh gia / Do pho bien" description="Cac field ranking, rating, featured va trending.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Vote average</span>
                    <input
                      value={form.voteAverage}
                      onChange={(event) => setForm((prev) => ({ ...prev, voteAverage: event.target.value }))}
                      placeholder="8.5"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Vote count</span>
                    <input
                      value={form.voteCount}
                      onChange={(event) => setForm((prev) => ({ ...prev, voteCount: event.target.value }))}
                      placeholder="1200"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Rating</span>
                    <input
                      value={form.rating}
                      onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))}
                      placeholder="4.5"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Average rating</span>
                    <input
                      value={form.averageRating}
                      onChange={(event) => setForm((prev) => ({ ...prev, averageRating: event.target.value }))}
                      placeholder="4.8"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Total ratings</span>
                    <input
                      value={form.totalRatings}
                      onChange={(event) => setForm((prev) => ({ ...prev, totalRatings: event.target.value }))}
                      placeholder="350"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>View count</span>
                    <input
                      value={form.viewCount}
                      onChange={(event) => setForm((prev) => ({ ...prev, viewCount: event.target.value }))}
                      placeholder="15000"
                      className={inputClassName}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">
                    <label className={checkboxCardClassName}>
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
                      />
                      is_featured
                    </label>
                    <label className={checkboxCardClassName}>
                      <input
                        type="checkbox"
                        checked={form.isTrending}
                        onChange={(event) => setForm((prev) => ({ ...prev, isTrending: event.target.checked }))}
                      />
                      is_trending
                    </label>
                  </div>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom G - Mapping phu" description="tmdb_id va imdb_id la metadata optional, khong phai khoa chinh.">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>TMDB ID</span>
                    <input
                      value={form.tmdbId}
                      onChange={(event) => setForm((prev) => ({ ...prev, tmdbId: event.target.value }))}
                      placeholder="Optional"
                      className={inputClassName}
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span>IMDB ID</span>
                    <input
                      value={form.imdbId}
                      onChange={(event) => setForm((prev) => ({ ...prev, imdbId: event.target.value }))}
                      placeholder="Optional"
                      className={inputClassName}
                    />
                  </label>
                </div>
              </MetadataSection>

              <MetadataSection title="Nhom H - The loai" description="Multi-select genres, khong bat buoc phai chon.">
                {metadataLoading ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    Dang tai genres...
                  </div>
                ) : genres.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
                    Chua co genre options tu backend.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre) => {
                        const active = form.genreIds.includes(genre.id);
                        return (
                          <button
                            key={genre.id}
                            type="button"
                            onClick={() => toggleGenre(genre.id)}
                            className={`rounded-full border px-3 py-2 text-sm transition ${
                              active
                                ? 'border-red-400 bg-red-500/15 text-red-100'
                                : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            {genre.name}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                      {selectedGenres.length
                        ? `Da chon: ${selectedGenres.map((genre) => genre.name).join(', ')}`
                        : 'Chua chon genre nao.'}
                    </div>
                  </>
                )}
              </MetadataSection>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
                Source type duoc giu la <span className="font-semibold text-white">{getSourceType()}</span> de khong
                anh huong flow upload Cloudflare R2.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {saving ? 'Dang luu...' : form.editingId ? 'Cap nhat phim' : 'Them phim'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-white">Upload video R2</h4>
                  <p className="mt-1 text-sm text-slate-400">
                    File se duoc luu theo cau truc videos/movies/{currentMovieId || 'movie_id'}/quality/file.
                  </p>
                </div>
                {currentMovieId ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Movie ID hien tai: #{currentMovieId}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                    Movie ID hien tai: chua co
                  </span>
                )}
              </div>

              <div
                className={`mt-3 rounded-2xl border px-4 py-3 text-xs ${
                  isStorageReady
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                }`}
              >
                Storage R2: {isStorageReady ? `OK (${storageHealth?.bucketName || 'bucket'})` : storageHealthError || 'Dang kiem tra...'}
              </div>

              {!currentMovieId ? (
                <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-xs text-sky-200">
                  Buoc 1: luu phim de tao movie_id noi bo. Buoc 2: chon file va upload R2.
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px]">
                <input
                  type="file"
                  accept="video/mp4,application/x-mpegurl,application/vnd.apple.mpegurl,video/mp2t"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  disabled={uploading}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
                />
                <input
                  value={uploadQuality}
                  onChange={(event) => setUploadQuality(event.target.value)}
                  placeholder="1080p"
                  disabled={uploading}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={handleUploadVideo}
                disabled={uploadDisabled}
                className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {uploadButtonLabel}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Danh sach phim</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Danh sach dung movie_id noi bo de sua metadata va upload video R2.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tim theo title / slug / movie_id / tmdb_id"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white lg:max-w-sm"
              />
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-400">
                  Dang tai du lieu admin movie...
                </div>
              ) : filteredMovies.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-400">
                  Chua co phim nao phu hop.
                </div>
              ) : (
                filteredMovies.map((movie) => (
                  <article
                    key={movie.id}
                    className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:grid-cols-[96px_1fr_auto]"
                  >
                    <img src={getMoviePoster(movie)} alt={movie.title} className="h-32 w-24 rounded-xl object-cover" />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-white">{movie.title}</h4>
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">#{movie.id}</span>
                        {movie.slug ? (
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{movie.slug}</span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm text-slate-400">
                        {movie.original_title || 'Khong co original title'}
                        {movie.release_year ? ` · ${movie.release_year}` : ''}
                        {movie.type ? ` · ${movie.type}` : ''}
                      </div>

                      <div className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                        {movie.overview || movie.description || 'Chua co overview.'}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-1 ${
                            (movie.status || '').toLowerCase() === 'deleted'
                              ? 'bg-rose-500/15 text-rose-200'
                              : movie.is_active
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-red-500/15 text-red-200'
                          }`}
                        >
                          {movie.status || (movie.is_active ? 'active' : 'inactive')}
                        </span>
                        {(movie.status || '').toLowerCase() === 'deleted' ? (
                          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-200">
                            Deleted
                          </span>
                        ) : null}
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                          {movie.source_type || 'unknown'}
                        </span>
                        {movie.is_premium ? (
                          <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-fuchsia-200">Premium</span>
                        ) : null}
                        {movie.is_featured ? (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-200">Featured</span>
                        ) : null}
                        {movie.is_trending ? (
                          <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-200">Trending</span>
                        ) : null}
                        {movie.genres?.length ? (
                          <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-200">
                            Genres {movie.genres.length}
                          </span>
                        ) : null}
                        {movie.sources?.length ? (
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                            R2 sources {movie.sources.length}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-start justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(movie)}
                        className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Sua / upload
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMovie(movie)}
                        disabled={deletingMovieId === movie.id || (movie.status || '').toLowerCase() === 'deleted'}
                        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingMovieId === movie.id ? 'Dang xoa...' : (movie.status || '').toLowerCase() === 'deleted' ? 'Da xoa' : 'Xoa phim'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
