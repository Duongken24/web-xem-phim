create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value, description, updated_at)
values (
  'use_tmdb',
  'false'::jsonb,
  'Bat/tat TMDB runtime cho metadata va fallback.',
  now()
)
on conflict (key) do nothing;
