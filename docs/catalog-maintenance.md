# Exercise catalog maintenance

The live catalog lives in:

- `src/data/exercises.ts`
- `src/data/enduranceExercises.ts`
- `src/data/hybridCalisthenicsExercises.ts`

## After changing exercise ids or categories

Progress charts (`trainingCategoryTotals` in `src/utils/progressStats.ts`) use a **generated** slim map, not the full catalog at runtime.

**Run this and commit the output with your catalog edit:**

```bash
npm run generate:category-index
```

That refreshes `src/data/exerciseCategoryIndex.ts` (~600 id → category entries, including legacy `CP-*` aliases for `PC-*` ids).

If you skip this step, new or renamed exercises may show up with wrong/missing category totals on Progress.

## Related catalog scripts

| Command | When |
| ------- | ---- |
| `npm run audit:catalog` | Inventory / QA pass on the catalog |
| `npm run catalog:enrich` | Automated metadata patches — **also run `generate:category-index` afterward** if ids/categories changed |
| `npm run generate:category-index` | Any manual or scripted catalog id/category edit |
