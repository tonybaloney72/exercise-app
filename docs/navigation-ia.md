# Navigation & information architecture (draft)

> **Status:** Planning only - not implemented.  
> **Goal:** Replace the current 5-tab layout before Nutrition ships.  
> **Target tabs (3):** **Workout** → **Health** → **Settings**. Nutrition is a **route under Health**, not a bottom tab.

---

## Decisions (locked)

| #   | Topic                        | Decision                                                                                                                                                                           |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | First tab name               | **Workout** - tab label and path prefix **`/workout`**.                                                                                                                            |
| 2   | Health stat URLs             | **Human-readable slugs** in the path (see table below). Internal registry keys (`active_kcal`, etc.) map in code only.                                                             |
| 3   | Settings landing             | **Flat list** of links (no grouped sections on the hub).                                                                                                                           |
| 4   | Cardio exercise URLs         | Use **`CardioActivityKind`** slugs (`jog`, `walk`, `hike`, …), **not** catalog exercise ids (`END-JOG`). Example: `/health/exercises/jog`.                                         |
| 5   | Day review (week vs history) | **One shared component** for `/workout/week/[date]` and `/workout/history/[date]` - different back links / chrome via props; keep code DRY.                                        |
| 6   | Nutrition                    | **No 4th nav tab.** Routes at **`/nutrition`** (logging) and unified **`/health/calories`** (burned + consumed + meals for the day). Enter nutrition from Health, not the tab bar. |
| 7   | Calorie cards on Health      | **Two cards** on `/health` landing - **Burned** and **Consumed** (today only). **Both** tap through to **`/health/calories`**.                                                     |
| 8   | Old URL redirects            | **Not required** for launch - tiny user base (browser + one APK install). Replace routes and update in-app links; drop old paths without a redirect layer.                         |

---

## Current vs target (high level)

| Today (5 tabs)             | Target (3 tabs)                                                          |
| -------------------------- | ------------------------------------------------------------------------ |
| Today                      | **Workout** - `/workout`                                                 |
| Weekly                     | **Workout → week** - `/workout/week`                                     |
| Progress (history)         | **Workout → history** - `/workout/history`                               |
| Progress (metrics/charts)  | **Health** - `/health`, `/health/[stat]`                                 |
| Progress (exercise charts) | **Health → exercises** - `/health/exercises`, `/health/exercises/[kind]` |
| Library                    | **Settings → library** - `/settings/library`                             |
| Settings                   | **Settings** (builders moved here)                                       |

**Removed as top-level tabs:** `/weekly`, `/progress`, `/library`.

---

## Bottom navigation (target)

```
[ Workout ]  [ Health ]  [ Settings ]
```

**Nutrition does not get a tab.** Users open **`/nutrition`** from Health (e.g. log meals, calorie card CTAs). Avoids a 4th tab and avoids a second row of segments inside Health (Exercises | Nutrition).

---

## Route map

### Workout (`/workout`)

```
/workout                              Daily hub (current /today)
├── /workout/week                     Current week plan (current /weekly)
│   └── /workout/week/[date]          Day in current week → shared day review
├── /workout/history                  Past days calendar (current /progress/history)
│   ├── /workout/history/[date]       Past day review → shared day review
│   └── /workout/history/[date]/log   Backfill missed day
```

**Week vs history**

- **Week** = generated plan for the **current week** only → `/workout/week/[date]`.
- **History** = **past** days only (no future dates). Past days in the current week use **history** URLs when viewing the archive.
- **Today:** tap today from week or history → **`/workout`** (daily hub).

**Shared day review (DRY)**

- `WorkoutDayReview` (or successor) used for both:
  - `/workout/week/[date]` - back to week
  - `/workout/history/[date]` - back to history
- Same content; `variant` / `backHref` props for chrome only.

---

### Health (`/health`)

```
/health                               Today-only cards (metrics + Exercises + Burned + Consumed calorie cards)
├── /health/[stat]                    Metric detail + time ranges (see slug table; not used for calories)
├── /health/calories                  Unified calorie day view - target of both calorie cards
├── /health/exercises                 Training focus, Exercise over time, recent cardio teaser
│   └── /health/exercises/[kind]      Cardio kinds only: jog, walk, hike, cycle, swim, …
└── /nutrition                        Meal logging & diary (linked from Health, not a tab)
```

#### Health stat URL slugs (`/health/[stat]`)

Human-readable paths. Map from `HealthDailyMetricKey` / registry in a single module (e.g. `healthStatRoutes.ts`).

| URL slug             | Metric             | Notes                                |
| -------------------- | ------------------ | ------------------------------------ |
| `steps`              | Steps              |                                      |
| `heart-rate`         | Average heart rate |                                      |
| `resting-heart-rate` | Resting heart rate |                                      |
| `blood-oxygen`       | SpO₂               |                                      |
| `sleep`              | Sleep total        | Stages in detail view as data allows |
| `vo2-max`            | VO₂ max            | Sparse / trend                       |
| `distance`           | Distance           | If surfaced on landing later         |
| `weight`             | Weight             | Body measurements when synced        |

**Detail pages:** range switcher **Today | Week | Month | Year | All time**.

**Calories on the landing (not `/health/[stat]`)**

- **Burned** - today’s active kcal from Health Connect (placeholder/empty until data exists).
- **Consumed** - today’s diary total from nutrition (placeholder/empty until Nutrition ships).
- **Both cards** → **`/health/calories`** (unified detail). No separate `/health/calories-burned` routes.

#### `/health/calories` - unified calorie view (Health + Nutrition)

Single place for **all calorie information for a day**:

- **Burned** - Health Connect active energy (and related workout/cardio context as needed)
- **Consumed** - nutrition diary totals (when `/nutrition` exists)
- **Meals** - list / drill to meal detail
- **Net** - simple in vs out for the day (copy TBD)

Nutrition logging still lives at **`/nutrition`**; this page is the **read/analyze** hub. Entry: either calorie card on `/health`, or links from meal logging.

#### `/health/exercises`

| Content                                  | Location                        |
| ---------------------------------------- | ------------------------------- |
| Training focus chart                     | `/health/exercises`             |
| Exercise over time chart                 | `/health/exercises`             |
| ~5 most recent cardio sessions (clumped) | `/health/exercises`             |
| Per-cardio-kind pages                    | `/health/exercises/[kind]` only |

**Cardio `[kind]` values** (from `CardioActivityKind`, not catalog ids):

`jog` · `walk` · `hike` · `cycle` · `treadmill` · `elliptical` · `indoor_bike` · `row` · `stairs` · `swim`

Example: `/health/exercises/jog` - history, distance, steps, time, HR, route polylines (maps later).

**No** per-strength-exercise pages (~500+ catalog entries; reps-only).

---

### Nutrition (`/nutrition`)

**Not a bottom tab.** FatSecret-backed logging and diary ([ROADMAP](../ROADMAP.md#nutrition--meal-logging-fatsecret)).

- **Entry:** Health landing (tile / “Log food”) and deep links from **`/health/calories`**.
- **Scope:** search, barcode, meals, favorites, daily diary editing.
- **Relationship to Health:** passive metrics and charts stay on `/health/*`; active logging on `/nutrition`; **`/health/calories`** combines both for the daily calorie story.

**Why not a 4th tab or Health sub-tabs**

- 4 tabs (Workout, Health, Nutrition, Settings) competes with a clean 3-tab bar.
- Segmented control inside Health (Metrics | Exercises | Nutrition) eats vertical space and duplicates nav patterns.
- **`/nutrition` route + Health entry points** keeps the tab bar stable while Nutrition ships later.

---

### Settings (`/settings`)

**Flat list** on the settings hub - no section headers required for v1.

```
/settings                         Flat link list
├── /settings/library             Exercise library (was /library)
├── /settings/training            Training preferences
├── /settings/build-guided        Guided week builder (was /weekly/build-guided)
├── /settings/build-custom        Custom week builder (was /weekly/build)
├── /settings/device              Cardio & sensors, HC, GPS
└── /settings/app                 App & updates
```

---

## Route mapping (old → new)

Reference when moving files and updating links. **No redirect middleware** - old paths can be deleted once callers are updated.

| Old path                       | New path                      |
| ------------------------------ | ----------------------------- |
| `/today`                       | `/workout`                    |
| `/weekly`                      | `/workout/week`               |
| `/weekly/day/[date]`           | `/workout/week/[date]`        |
| `/progress`                    | `/health`                     |
| `/progress/history`            | `/workout/history`            |
| `/progress/history/[date]`     | `/workout/history/[date]`     |
| `/progress/history/[date]/log` | `/workout/history/[date]/log` |
| `/progress/calendar`           | `/workout/history`            |
| `/library`                     | `/settings/library`           |
| `/weekly/build-guided`         | `/settings/build-guided`      |
| `/weekly/build`                | `/settings/build-custom`      |

Update `BottomNav`, `tabRoutes.ts`, onboarding, and hard-coded links when implementing.

---

## What stays the same (behavior)

- Generated **week plan** drives week view.
- Guest vs account sync unchanged unless route moves require touch points.
- Health Connect sync moves UI only in first nav pass.
- **Quick activity log** on `/workout`.

---

## Implementation phases (suggested)

1. **Routes** - `/workout`, `/health`, `/settings/*`; remove old tab paths (no redirects).
2. **Workout tab** - hub, week, history; shared day review component.
3. **Health tab** - stat cards, `/health/[stat]` + slug map, move charts from Progress.
4. **Health exercises** - `/health/exercises`, cardio `[kind]` pages.
5. **Settings** - flat list, library + builders.
6. **Nutrition** - `/nutrition` + `/health/calories` (after nav stable).

---

## Open questions (remaining)

- [ ] Copy and layout for **`/health/calories`** (net calories, meal list density).
- [ ] **`/nutrition`** sub-routes (e.g. `/nutrition/log`, `/nutrition/meal/[id]`) - defer until FatSecret IA is scoped.

---

## Related code (today)

| Area                    | Location                                                                         |
| ----------------------- | -------------------------------------------------------------------------------- |
| Bottom tabs             | `src/components/layout/BottomNav.tsx`                                            |
| Tab routes              | `src/lib/tabRoutes.ts`                                                           |
| Cardio kind slugs       | `CardioActivityKind` in `src/types/index.ts`; labels in `src/lib/cardioKinds.ts` |
| Day review              | `src/components/workout/WorkoutDayReview.tsx`                                    |
| Health metrics registry | `src/lib/health/dailyMetricRegistry.ts`                                          |
| Current routes          | `src/app/(app)/today`, `weekly`, `progress`, `library`, `settings`               |

---

_Last updated: July 2026 - planning draft._
