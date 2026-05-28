# Supabase migrations

Apply all files in `supabase/migrations/` to the project linked from Vercel (and local dev) before relying on newer app features.

## Apply (hosted project)

From the repo root, with [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project:

```bash
npx supabase db push
```

Or run each new migration manually in the Supabase Dashboard → **SQL Editor** (in filename order).

## Migrations to verify (May 2026 app features)

| File | What it enables |
|------|-----------------|
| `20260518160000_user_settings_program_mode_layout.sql` | Settings **Your week**: Priorities / Layout / Custom; weekly category layout |
| `20260520140000_workout_logs_paused.sql` | In-progress workout cloud sync (`paused`, updated `save_workout` RPC) |
| `20260520120000_cardio_exercise_logs_phase3.sql` | Cardio section in logs (phase 3a) |
| `20260520120001_cardio_exercise_logs_phase3b.sql` | Cardio metrics on `exercise_logs` |
| `20260520150000_workout_day_templates.sql` | Saved **workout day templates** (save/reuse in customize) |
| `20260524120000_user_settings_weekly_ppl_schedule.sql` | Customizable 6-day P/P/L week schedule |
| `20260525120000_user_settings_program_mode_preset.sql` | `program_mode` value `priorities` → `preset` |

If a column or RPC is missing, authenticated users may see failed saves or settings that do not persist.

## Local Supabase

```bash
npx supabase start
npx supabase db reset   # applies all migrations + seed
```

## After deploy

1. Confirm migrations applied: Dashboard → **Database** → **Migrations**.
2. Smoke-test: change program mode in Settings; start workout → **Save for later** (signed in); save a day template in **Customize this workout**.
