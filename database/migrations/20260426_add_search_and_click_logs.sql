-- Proposal only. Do not auto-run from application code.
-- Purpose:
-- 1. Add behavior logs for search queries and movie clicks.
-- 2. Keep movies.id as the internal key for analytics.
-- 3. Support anonymous users while preserving optional links to profiles.

begin;

create table if not exists public.search_logs (
  id bigserial primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  query text not null,
  normalized_query text null,
  source_page text null,
  filters_json jsonb null,
  result_count integer null,
  clicked_movie_id integer null references public.movies(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.movie_click_logs (
  id bigserial primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  movie_id integer not null references public.movies(id),
  source_page text null,
  source_module text null,
  query_text text null,
  recommendation_source text null,
  rank_position integer null,
  session_id text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_logs_user_id on public.search_logs(user_id);
create index if not exists idx_search_logs_clicked_movie_id on public.search_logs(clicked_movie_id);
create index if not exists idx_search_logs_created_at on public.search_logs(created_at desc);
create index if not exists idx_search_logs_query on public.search_logs(query);

create index if not exists idx_movie_click_logs_user_id on public.movie_click_logs(user_id);
create index if not exists idx_movie_click_logs_movie_id on public.movie_click_logs(movie_id);
create index if not exists idx_movie_click_logs_created_at on public.movie_click_logs(created_at desc);
create index if not exists idx_movie_click_logs_session_id on public.movie_click_logs(session_id);

commit;
