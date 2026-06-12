-- User feedback queue (exercise reports v1; general feedback v2). Digest email marks emailed_at.

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  category text not null,
  details text,
  exercise_id text,
  reporter_user_id uuid references auth.users (id) on delete set null,
  snapshot_name text,
  snapshot_description text,
  snapshot_link text,
  context jsonb,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index user_feedback_pending_digest_idx
  on public.user_feedback (created_at)
  where emailed_at is null;

create index user_feedback_exercise_id_idx
  on public.user_feedback (exercise_id)
  where exercise_id is not null;

alter table public.user_feedback enable row level security;

-- Clients may insert only; reads/updates are service-role (digest job).
create policy "user_feedback_insert" on public.user_feedback
  for insert
  with check (
    reporter_user_id is null
    or reporter_user_id = auth.uid()
  );
