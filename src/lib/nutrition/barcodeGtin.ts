/** Strip to digits and left-pad to GTIN-13 for FatSecret barcode lookup. */
export function normalizeBarcodeToGtin13(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 13) return null;
  return digits.padStart(13, "0");
}

export function isValidGtin13(gtin: string): boolean {
  return /^\d{13}$/.test(gtin);
}
