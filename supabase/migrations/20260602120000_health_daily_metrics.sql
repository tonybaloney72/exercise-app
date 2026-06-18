-- Daily Health Connect (and app) metric rollups: one row per user per local day per metric.

create type public.health_metric_category as enum (
  'activity',
  'body_measurements',
  'cycle_tracking',
  'nutrition',
  'sleep',
  'vitals',
  'wellness'
);

create type public.health_metric_agg_method as enum (
  'sum',
  'avg',
  'last',
  'max',
  'min'
);

create table public.health_daily_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  category public.health_metric_category not null,
  metric_key text not null,
  value_num numeric,
  value_json jsonb,
  unit text not null,
  agg_method public.health_metric_agg_method not null,
  source text not null default 'health_connect',
  synced_at timestamptz not null default now(),
  primary key (user_id, log_date, metric_key)
);

create index health_daily_metrics_user_log_date_desc_idx
  on public.health_daily_metrics (user_id, log_date desc);

create index health_daily_metrics_user_category_log_date_desc_idx
  on public.health_daily_metrics (user_id, category, log_date desc);

alter table public.health_daily_metrics enable row level security;

create policy "health_daily_metrics_owner_select" on public.health_daily_metrics
  for select using (auth.uid() = user_id);

create policy "health_daily_metrics_owner_insert" on public.health_daily_metrics
  for insert with check (auth.uid() = user_id);

create policy "health_daily_metrics_owner_update" on public.health_daily_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "health_daily_metrics_owner_delete" on public.health_daily_metrics
  for delete using (auth.uid() = user_id);

comment on table public.health_daily_metrics is
  'Per-user daily health metric rollups (HC categories). Scalar values in value_num; structured readings in value_json.';
