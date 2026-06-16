-- Body weight log: one row per user per calendar day.

create table public.weight_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_lb numeric(5, 1) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date),
  constraint weight_entries_weight_lb_range check (weight_lb > 0 and weight_lb <= 999)
);

create index weight_entries_user_log_date_desc_idx
  on public.weight_entries (user_id, log_date desc);

alter table public.weight_entries enable row level security;

create policy "weight_entries_owner_select" on public.weight_entries
  for select using (auth.uid() = user_id);

create policy "weight_entries_owner_insert" on public.weight_entries
  for insert with check (auth.uid() = user_id);

create policy "weight_entries_owner_update" on public.weight_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weight_entries_owner_delete" on public.weight_entries
  for delete using (auth.uid() = user_id);

comment on table public.weight_entries is
  'Body weight in pounds; one entry per local calendar day per user.';

-- Backfill from legacy JSONB on user_settings.
insert into public.weight_entries (user_id, log_date, weight_lb, updated_at)
select
  us.user_id,
  (entry->>'date')::date,
  (entry->>'weightLb')::numeric(5, 1),
  now()
from public.user_settings us
cross join lateral jsonb_array_elements(us.weight_log) as entry
where jsonb_array_length(us.weight_log) > 0
  and (entry->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
  and (entry->>'weightLb')::numeric > 0
  and (entry->>'weightLb')::numeric <= 999
on conflict (user_id, log_date) do update
  set weight_lb = excluded.weight_lb,
      updated_at = excluded.updated_at;

alter table public.user_settings
  drop column if exists weight_log;
