create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('result', 'rating')),
  locale text not null check (locale in ('ja', 'en', 'zh')),
  age_band text not null,
  care_level text not null,
  place text not null,
  resident_tax text not null,
  ratio_status text not null,
  ratio smallint,
  service_path text not null,
  rating text
);

alter table public.usage_events enable row level security;
