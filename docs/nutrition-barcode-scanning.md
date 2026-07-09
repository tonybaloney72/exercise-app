# Nutrition: barcode scanning (prep)

> **Status:** Implemented (Android app only). Web/PWA uses search instead.  
> **User entry points (planned):** Home → Log food → **Scan**; optionally Meals / Add food sheet.

---

## Goal

Scan a product barcode (UPC/EAN), resolve it to a FatSecret food, then reuse the existing **serving picker → diary log** flow (`AddFoodSheet` serving step or shared helper).

---

## FatSecret API (Premier)

| Item       | Detail                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Method     | `food.find_id_for_barcode.v2` (REST: `GET …/food/barcode/find-by-id/v2`)                                                                                                        |
| Tier       | **Premier exclusive** - confirm your app has barcode enabled in the [FatSecret developer console](https://platform.fatsecret.com/)                                              |
| Input      | **GTIN-13** string (13 digits, zero-padded left). UPC-A / EAN-13 / EAN-8 supported; UPC-E must convert to UPC-A first                                                           |
| Success    | Same shape as `food.get.v2` - full food + servings (reuse `parseFoodDetailResponse` in `src/lib/fatsecret/foodDetail.ts`)                                                       |
| Not found  | API error **211** - show “No food for this barcode” + fallback to manual search                                                                                                 |
| Auth today | Platform **OAuth 1.0** consumer signing via `fatsecretSignedRequest` (same as `foods.search`, `food.get.v2`) - verify barcode works on your Premier Free key before building UI |

### Server work (next session)

1. **`src/lib/nutrition/barcodeGtin.ts`** - normalize scanned digits → GTIN-13 (`normalizeBarcodeToGtin13`)
2. **`src/lib/fatsecret/foodBarcode.ts`** - `findFoodByBarcode(gtin13)` calling `food.find_id_for_barcode.v2`
3. **`src/app/api/nutrition/barcode/route.ts`** - `GET ?code=…` → `{ food: FoodDetail }` or 404
   - Use `requireNutritionApiAccess()` (same as search)
   - Validate length / digits only
4. **Tests** - GTIN padding (UPC-A 12 → 13), parser reuse, 211 → friendly error

---

## Client / device

| Platform                | Approach                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Android (Capacitor)** | Add a barcode plugin, e.g. `@capacitor-mlkit/barcode-scanning` or `@capawesome/capacitor-barcode-scanner` - **not in repo yet** |
| **Web / PWA**           | Optional fallback: `BarcodeDetector` where supported, or manual entry of barcode digits                                         |
| **Permissions**         | Camera - mirror patterns in `CardioPermissionsSection` (check / request / open settings)                                        |

### UI work (next session)

1. **`QuickMealLog`** - fifth tile or row: **Scan barcode** (opens scanner sheet)
2. **`BarcodeScanSheet`** (new) - camera view → on scan → `GET /api/nutrition/barcode` → jump to serving step
3. **Refactor `AddFoodSheet`** (optional) - extract shared “serving + log” step so scan bypasses search; or open sheet at serving step with preloaded `FoodDetail`
4. **Meals tab** - same Scan entry on add-food (optional parity)

---

## Flow (target)

```
Home → Scan → [camera] → GTIN-13 → API barcode lookup
  → FoodDetail → pick serving → POST /api/nutrition/diary → done
```

Same meal preset as quick tiles: pass `meal` from whichever tile opened scan, or prompt meal if opened from a global Scan button.

---

## Pre-flight checklist (before coding)

- [ ] FatSecret developer account: **Premier** + barcode API enabled (test one barcode with curl or a throwaway script)
- [ ] Pick Capacitor barcode plugin; run `npm install` + `npx cap sync android`
- [ ] Add **camera** permission strings (`AndroidManifest.xml`, iOS `Info.plist` if applicable)
- [ ] Decide web fallback (manual code entry vs “Scan on Android only”)
- [ ] Privacy copy: camera used only for nutrition lookup (update Terms/Privacy if needed)

---

## Env / deploy (unchanged)

Server-only (already used for nutrition):

- `FATSECRET_OAUTH_ONE_KEY` / `FATSECRET_OAUTH_ONE_SECRET`
- `FATSECRET_PROFILE_ENCRYPTION_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No new env vars expected for barcode unless FatSecret requires a separate scope flag in the console.

---

## Related code (today)

| Area                   | Path                                                   |
| ---------------------- | ------------------------------------------------------ |
| Quick meal tiles       | `src/components/home/QuickMealLog.tsx`                 |
| Add food flow          | `src/components/nutrition/AddFoodSheet.tsx`            |
| Food detail parse      | `src/lib/fatsecret/foodDetail.ts`                      |
| Text search API        | `src/app/api/nutrition/search/route.ts`                |
| OAuth 1 signing        | `src/lib/fatsecret/oauth1.ts`                          |
| Permissions UI pattern | `src/components/settings/CardioPermissionsSection.tsx` |

---

_Last updated: July 2026._
