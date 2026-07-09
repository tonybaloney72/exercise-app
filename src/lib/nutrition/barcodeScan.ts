import { isAndroidNative } from "@/lib/capacitorRuntime";

export class BarcodeScanCancelledError extends Error {
  readonly name = "BarcodeScanCancelledError";
}

export class BarcodeScanUnavailableError extends Error {
  readonly name = "BarcodeScanUnavailableError";
}

export function pluginErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function isBarcodeScanCancelled(error: unknown): boolean {
  return /cancel/i.test(pluginErrorMessage(error));
}

/** Launch the native Google barcode scanner (Android only). */
export async function scanProductBarcode(): Promise<string> {
  if (!isAndroidNative()) {
    throw new BarcodeScanUnavailableError(
      "Barcode scanning is only available in the Android app.",
    );
  }

  const { BarcodeFormat, BarcodeScanner } = await import(
    "@capacitor-mlkit/barcode-scanning"
  );

  const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!moduleStatus.available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  const supported = await BarcodeScanner.isSupported();
  if (!supported.supported) {
    throw new BarcodeScanUnavailableError(
      "Barcode scanning is not supported on this device.",
    );
  }

  let result;
  try {
    result = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Ean13,
        BarcodeFormat.Ean8,
        BarcodeFormat.UpcA,
        BarcodeFormat.UpcE,
      ],
    });
  } catch (err) {
    if (isBarcodeScanCancelled(err)) {
      throw new BarcodeScanCancelledError();
    }
    throw err;
  }

  const barcode =
    result.barcodes[0]?.rawValue?.trim() ||
    result.barcodes[0]?.displayValue?.trim() ||
    "";
  if (!barcode) {
    throw new BarcodeScanCancelledError();
  }

  return barcode;
}
