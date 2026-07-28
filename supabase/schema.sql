create extension if not exists pgcrypto;

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  zone text not null,
  stability double precision not null check (stability between 0 and 1),
  transition_flag boolean not null default false
);

create table if not exists public.exposures (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  gamma_exposure double precision,
  delta_exposure double precision,
  vega_exposure double precision,
  theta_exposure double precision,
  rho_exposure double precision,
  call_wall double precision,
  put_wall double precision,
  gamma_flip_lower double precision,
  gamma_flip_upper double precision
);

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  direction_score double precision check (direction_score between -1 and 1),
  explosion_score double precision check (explosion_score between 0 and 1),
  precision_score double precision check (precision_score between 0 and 1)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  tier text not null check (tier in ('TIER_1', 'TIER_2')),
  direction text not null check (direction in ('LONG', 'SHORT')),
  zone text not null,
  precision double precision,
  explosion double precision
);

create index if not exists zones_timestamp_idx on public.zones (timestamp desc);
create index if not exists exposures_timestamp_idx on public.exposures (timestamp desc);
create index if not exists signals_timestamp_idx on public.signals (timestamp desc);
create index if not exists alerts_timestamp_idx on public.alerts (timestamp desc);

alter table public.zones enable row level security;
alter table public.exposures enable row level security;
alter table public.signals enable row level security;
alter table public.alerts enable row level security;

