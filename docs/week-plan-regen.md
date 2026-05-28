# Week plan regeneration

How the app decides to rebuild a stored training week vs keep the persisted copy.

## Fingerprint

`computePrefsFingerprint` in `src/lib/planGenerator.ts` hashes equipment, dislikes, program mode, layout, round density, rest days, cardio, expertise, progression filters, stretches, and (in **preset** mode) the PPL schedule segment (`ppl:ppl-2026-05-v4:…`).

`weekNeedsMaterialization` in `planResolver` compares the stored week’s `prefsFingerprint` to the current one. On mismatch, the week is regenerated from the current settings seed (unless the week source is **custom**).

## One-time regen after Phase 5 (`priorities` → `preset`)

The fingerprint includes `pm:preset` (formerly `pm:priorities`). After deploy + DB migration, signed-in users with a persisted week will see **one** automatic regen the first time plans load with the new code. Exercise selections may change slightly; completion history is unchanged.

No fingerprint alias is applied between the two `pm:` values — intentional, so stored weeks align with the canonical mode id.

## Guest vs signed-in

| Path | Behavior |
|------|----------|
| **Guest** | Plans materialize in memory from settings; no `training_weeks` row until sign-in. Changing schedule or mode updates the next in-memory build immediately. |
| **Signed-in** | `training_weeks` row holds `prefs_fingerprint`. Mismatch triggers regen via `planResolver` / `trainingWeekCustomize`. Settings saves go through Supabase `user_settings`. |

Auth merge (`migrateLocalDataIfNeeded`) does **not** reset `program_mode`; it only merges local settings when a local storage key exists.

## Frozen today

`workoutSessionGuard` and related Today flows treat **today** as special when a session is in progress or completed — customizing or regen must not wipe an active log. Week-level regen applies to future days and non-frozen slots; see `planResolver` and `trainingWeekCustomize` for `frozenDayOfWeek` / completion checks.

## PPL schedule changes

Editing the 6-day P/P/L schedule updates the `ppl:…` segment in the fingerprint (`pplWeekSchedule.ts` / `pplWeekTemplate.ts`), which triggers regen for non-custom weeks — same as equipment or layout changes.

## Related

- Migrations: `supabase/migrations/20260525120000_user_settings_program_mode_preset.sql`
- ROADMAP: **6-day PPL week engine** Phases 5–6
