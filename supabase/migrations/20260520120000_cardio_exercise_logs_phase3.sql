-- Phase 3a: enum + column only.
-- PostgreSQL cannot use a new enum value in the same transaction as ADD VALUE (55P04).
-- Backfill and RPC changes are in 20260520120001_cardio_exercise_logs_phase3b.sql.

alter type public.exercise_log_section add value if not exists 'cardio';

alter table public.exercise_logs
  add column if not exists actual_distance_mi numeric(5, 2)
    constraint exercise_logs_actual_distance_mi_chk
      check (actual_distance_mi is null or actual_distance_mi >= 0);
