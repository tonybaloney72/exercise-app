# Cardio tracking (deprecated)

> **This doc is retired (July 2026).** It was field notes from the Capgo + sample-read era. Do not extend it.

**Use instead:**

| Topic | Where |
| ----- | ----- |
| Open work & shipped cardio/HC history | [ROADMAP.md](../ROADMAP.md) |
| Android APK, permissions, dev scripts | [docs/capacitor-android.md](./capacitor-android.md) |
| Health Connect + GPS implementation | `src/lib/health/` (`HealthConnectPlugin`, `nativeHealth.ts`, `resolveCardioQuickLog.ts`) |
| GPS foreground service | `android/.../GpsTrackingService.java`, `src/lib/geo/gpsTrackSession.ts` |

**Current stack (APK):** Native `androidx.health.connect` via `HealthConnect` Capacitor plugin — `AggregateRequest` for steps/distance/calories/HR (no Capgo, no sample-sum fallback). Exercise sessions via `ExerciseSessionRecord`. Writes via `HealthExerciseWritePlugin`.

**Next:** optional MapLibre basemap (v2); retroactive HC route on completed history rows. ME **polyline** + **HC route import** shipped (`GpsRoutePolyline`, `gps_track_points`).
