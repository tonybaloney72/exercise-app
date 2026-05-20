# Guest vs account

MyExercise uses two access modes. **Guest** is for trying the app on one device; **account** is the full product (portfolio demo + daily use).

## Guest (Continue as guest)

**Can do**

- **Today** — follow an auto-generated plan for the current calendar week; start, pause, and complete workouts
- **Weekly** — browse Sun–Sat; open each day (preview or completed log review)
- **Progress** — charts and stats from workouts stored in **localStorage** on this device
- **Library** — search and filter exercises; set per-exercise timer defaults (local)
- **Settings** — dark mode, rest/set timers, equipment (regenerates the in-memory week when prefs change), equipment onboarding
- **Workout session** — log sets, timers, swap/skip, add/remove exercises or rounds during a session (saved in the **workout log** only)

**Cannot do (requires account)**

- Save a **persistent training week** across reloads and devices
- **Customize** a day’s prescribed plan or use **Build my week**
- Program modes: priorities, weekly layout, custom week, round density
- **Default stretches** lists in Settings (guest days use catalog-derived stretches)
- Library **favorites / dislikes** (generator and swap weighting)
- **Cloud sync** of workouts and in-progress sessions

Guests do **not** get a mirror of `user_training_weeks` in localStorage. The prescribed week is **materialized on read** from catalog + guest settings. That is intentional.

## Account (sign up / log in)

Everything above, plus:

- Persisted **Sun–Sat week** in Supabase (`user_training_weeks`)
- **Customize this workout** / **Customize this day** and **week builder**
- **Workout day templates**
- Favorites, dislikes, default stretches, equipment-driven **week regen**
- Multi-device workout history and **Save for later** via cloud when signed in

## Week infrastructure (by design)

| Topic | Decision |
|-------|----------|
| Guest week persistence | **Not planned** — gate with copy, not localStorage parity |
| Guest custom week | **Not planned** — account-only |
| Week boundary cron | **Not needed** — lazy `weekKey` (Sunday local) on each visit |
| `week_start_date` setting | **Unused** — app uses Sun–Sat only; column may be removed later |

## UI pattern

Locked features use `AccountFeatureGate` (title, short benefit list, Log in / Create account). Routes such as `/weekly/build` redirect unauthenticated users to Weekly with the gate shown where relevant.

See [ADR 001](adr/001-persisted-training-weeks.md) for persisted-week mechanics (authenticated).
