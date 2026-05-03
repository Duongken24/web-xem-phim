import { buildApiUrl, readApiJson } from './api';

export interface CatalogGenre {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  tmdb_genre_id?: number | null;
}

interface GenresResponse {
  success: boolean;
  genres?: CatalogGenre[];
  error?: string;
}

interface YearsResponse {
  success: boolean;
  years?: number[];
  error?: string;
}

export async function getCatalogGenres(): Promise<CatalogGenre[]> {
  const response = await fetch(buildApiUrl('/api/genres'));
  const payload = await readApiJson<GenresResponse>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Khong the tai danh sach the loai.');
  }

  return Array.isArray(payload.genres) ? payload.genres : [];
}

export async function getCatalogYears(): Promise<number[]> {
  const response = await fetch(buildApiUrl('/api/years'));
  const payload = await readApiJson<YearsResponse>(response);

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Khong the tai danh sach nam phat hanh.');
  }

  return Array.isArray(payload.years) ? payload.years : [];
}
