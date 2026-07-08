/** FatSecret JSON often returns a single object or an array for the same field. */
export function normalizeFatSecretList<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
