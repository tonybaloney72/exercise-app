# Cardio tracking — Health Connect & GPS

Engineering notes from field reports after shipping Health Connect import + GPS quick log (June 2026). Bridge and permissions work; gaps are **data shape in Health Connect**, **GPS reliability in background**, and **quick-log UX**.

Related code: `src/lib/health/`, `cardioKindMap.ts`.

Open backlog items: [ROADMAP.md — Backlog](../ROADMAP.md#backlog).

---

## Health Connect import — exercise sessions vs samples

**Symptom:** Import succeeds (auth OK, `queryWorkouts_ok`) but `import_sessions` count is **0**. Health Connect UI shows steps, distance, sleep, HR, etc., but **no exercise session** labeled run/walk/jog.

**Confirmed on:** Samsung (auto walk), Pixel 9 Pro (jog with steps + distance in HC).

**Root cause:** Import reads `ExerciseSessionRecord` filtered by mapped type (`jog` → `running`, `walk` → `walking`). Many devices write **passive samples** (steps, distance, calories, HR) without creating a formal **exercise session**. Samsung Health and phone auto-activity are especially inconsistent on the session pipeline vs the steps pipeline.

**Diagnostics pattern (healthy integration, empty data):**

```
checkAuthorization_ok → hasReadAccess granted (incl. workouts)
queryWorkouts_ok (workoutType: running) → import_sessions count: 0
```

**Not the issue:** Capacitor bridge, API keys, or HC deprecation (Google Fit is deprecating; HC remains the on-device standard).

**Implementation directions:**

- Clearer empty state: “HC has activity data but no exercise sessions — try logging a workout in your fitness app, or use timed log below.”
- Broaden query: all sessions in window, client-side filter (`running`, `walking`, `other`, treadmill variants).
- **Time-window fallback:** when no session matches, aggregate steps / distance / calories / HR for user’s start–end window.

---

## Exercise sessions — generic “Workout” vs cardio

**Symptom:** In Health Connect and many recorder apps, a run or ride often shows up as a generic **Workout** (wording varies by OEM app), alongside strength-training sessions logged the same way.

**What HC stores:** Formal sessions are `ExerciseSessionRecord` entries with an exercise **type** enum. Our import maps app kinds via `cardioKindMap.ts` and queries with that `workoutType` filter. Recorders are inconsistent; strength apps may also create sessions that are not distance-based cardio.

**Impact today:** Import only returns sessions matching the mapped type. Wrong or generic typing → empty import or wrong rows when the query is broadened.

**Signals to prefer cardio sessions (client-side classification):**

- **`totalDistance` > 0** on the session (strength sessions often have duration/calories but no distance).
- **Route / GPS / map data** when HC or the recorder attaches it.
- **Session type** when trustworthy (`running`, `walking`, `cycling`, `swimming`, … vs `strength_training` / generic `workout` — verify enum strings per device via `@capgo/capacitor-health`).
- **User confirmation** in import UI: show type label, distance, duration, source app; user picks the matching row.

**Implementation directions:**

- Broaden `queryWorkouts` to all sessions in the window, then **filter/rank** with distance + route metadata + type.
- Default import list to **distance-present sessions only** for walk/jog/cycle/swim; optional “show all workouts.”
- Reuse the same classifier for the **time-window log** when matching an overlapping HC session.
- Log `workoutType`, `totalDistance`, and whether route data existed in diagnostics when import returns unexpected rows.

---

## GPS tracking — screen off & distance accuracy

**Symptom A — screen off:** User starts GPS, locks screen early. After ~0.7 mi (Google Maps), app shows **~0.05 mi**.

**Likely causes:**

- WebView / Capacitor `watchPosition` throttled or suspended when screen off (no foreground service / background location mode today).
- Points only appended in `recording` phase; acquiring phase does not accumulate distance.
- `appendPoint` drops updates unless **≥ 3 m** movement or **≥ 5 s** elapsed — under-counts with sparse background fixes.

**Symptom B — screen on:** Jog **1.03 mi** (Maps) vs **0.8 mi** tracked (~22% low).

**Likely causes:** Point sparsity, min-distance filter, no path smoothing, urban multipath / GPS drift, pause/resume behavior.

**Implementation directions:**

- Android foreground service + `ACCESS_BACKGROUND_LOCATION` for active recording.
- Wake lock during recording (partial — may already exist via settings).
- Relax or adaptive distance threshold; optional map-matched distance later.
- Log point count + duration in diagnostics on save for field debugging.

---

## Foreground GPS service (shipped)

Active walk/jog tracking uses a native Android foreground service (`GpsTrackingService`) with `FusedLocationProviderClient`. A persistent notification keeps location updates flowing when the screen is off. **No `ACCESS_BACKGROUND_LOCATION` ("Allow all the time")** is required — that permission is for location without an active foreground service.

TypeScript entry: `GpsTrackSession` → `GpsTracking` Capacitor plugin on Android; falls back to `@capacitor/geolocation` elsewhere.

---

## Timed cardio log + Health Connect window (shipped)

Quick log uses a unified **Start / End** flow (`CardioActivityRecorder` → `resolveCardioQuickLog`):

1. User picks activity (**walk / jog / cycle / swim / hike / …**).
2. **Start** runs timer + GPS (`GpsTrackSession.startImmediate()` on native).
3. **End** resolves metrics via `resolveCardioQuickLog`:
   - **First:** `queryWorkoutsOverlappingWindow` (no type filter) → rank by overlap, type match, GPS distance agreement → auto-pick or show up to 3 candidates.
   - **Else:** aggregate **distance**, **steps**, **active calories**, **avg HR** from samples in the user window.
   - **Else:** GPS distance + optional sample enrich.
   - **Last:** timer-only (duration filled).
4. Form pre-fills distance/time/health; user confirms and saves.

**Retroactive import:** "Import an earlier session instead" uses the same broad query + ranking (`importRecentCardioSessions`).

**Resolution types:** `health_connect_session` | `health_connect_samples` | `gps` | `timer_only`

**Distance authority:** ME GPS distance when Start/End tracking captured a route (≥2 points); else HC session → sample distance (`pickDistanceMi` in `resolveCardioQuickLog.ts`).

**GPS persistence (Part 2):** Route points saved on cardio `exercise_logs` rows as `gps_track_points` (local JSON + Supabase jsonb). HC session matching still uses GPS for ranking; distance saved from ME track when available.

**Open product questions:**

- Whether to keep improving GPS foreground service for screen-off accuracy (see GPS section).
- Minimum distance / route threshold refinements for generic `workout` sessions.
- Whether `@capgo/capacitor-health` exposes route series on `Workout` — if not, distance samples remain the fallback.
