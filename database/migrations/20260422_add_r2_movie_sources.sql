-- Proposal only. Do not auto-run from application code.
-- Purpose:
-- 1. Extend movie_sources / video_qualities for Cloudflare R2 or S3 metadata.
-- 2. Broaden source_type constraints for object-storage and direct playback.
-- 3. Keep existing rows and data intact.
-- 4. Do NOT touch watch_history.movie_id in this migration.

begin;

alter table if exists public.movie_sources
  add column if not exists storage_provider text,
  add column if not exists object_key text,
  add column if not exists public_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists duration integer,
  add column if not exists width integer,
  add column if not exists height integer;

alter table if exists public.video_qualities
  add column if not exists storage_provider text,
  add column if not exists object_key text,
  add column if not exists public_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'movie_sources_has_source'
      and conrelid = 'public.movie_sources'::regclass
  ) then
    alter table public.movie_sources drop constraint movie_sources_has_source;
  end if;
exception when undefined_table then
  null;
end;
$$;

alter table if exists public.movie_sources
  add constraint movie_sources_has_source
  check (
    video_url is not null
    or public_url is not null
    or object_key is not null
  ) not valid;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'movie_sources_source_type_check'
      and conrelid = 'public.movie_sources'::regclass
  ) then
    alter table public.movie_sources drop constraint movie_sources_source_type_check;
  end if;
exception when undefined_table then
  null;
end;
$$;

alter table if exists public.movie_sources
  add constraint movie_sources_source_type_check
  check (source_type in ('direct', 'r2', 's3', 'hls', 'mp4')) not valid;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'movies_source_type_check'
      and conrelid = 'public.movies'::regclass
  ) then
    alter table public.movies drop constraint movies_source_type_check;
  end if;
exception when undefined_table then
  null;
end;
$$;

alter table if exists public.movies
  add constraint movies_source_type_check
  check (source_type in ('tmdb', 'direct', 'r2', 's3', 'hls', 'mp4')) not valid;

create index if not exists idx_movie_sources_storage_provider on public.movie_sources(storage_provider);
create index if not exists idx_movie_sources_object_key on public.movie_sources(object_key);
create index if not exists idx_video_qualities_object_key on public.video_qualities(object_key);

commit;

-- Manual follow-up after review:
-- alter table public.movie_sources validate constraint movie_sources_has_source;
-- alter table public.movie_sources validate constraint movie_sources_source_type_check;
-- alter table public.movies validate constraint movies_source_type_check;
