// TMDB API response types used by the public movie catalog.

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  video: boolean;
}

export interface TMDBMovieDetail extends TMDBMovie {
  genres: TMDBGenre[];
  runtime: number;
  status: string;
  tagline: string;
  production_countries: TMDBProductionCountry[];
  production_companies: TMDBProductionCompany[];
  imdb_id: string;
  homepage: string;
  budget: number;
  revenue: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  cast_id: number;
  credit_id: string;
  gender: number;
  known_for_department: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  credit_id: string;
  gender: number;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

export interface TMDBMoviesResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBSearchParams {
  query?: string;
  page?: number;
  language?: string;
  include_adult?: boolean;
  region?: string;
  year?: number;
  primary_release_year?: number;
}

export interface TMDBDiscoverParams {
  page?: number;
  language?: string;
  sort_by?: string;
  include_adult?: boolean;
  include_video?: boolean;
  with_genres?: string;
  with_original_language?: string;
  year?: number;
  primary_release_year?: number;
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
}

export type TMDBImageSize =
  | 'w92'
  | 'w154'
  | 'w185'
  | 'w342'
  | 'w500'
  | 'w780'
  | 'original';

export type TMDBBackdropSize =
  | 'w300'
  | 'w780'
  | 'w1280'
  | 'original';
