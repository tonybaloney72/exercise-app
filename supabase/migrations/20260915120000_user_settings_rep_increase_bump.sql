-- Progression suggestion bump size (+1 or +2 Library default increase).

alter table public.user_settings
  add column if not exists rep_increase_bump smallint not null default 2
  check (rep_increase_bump in (1, 2));
