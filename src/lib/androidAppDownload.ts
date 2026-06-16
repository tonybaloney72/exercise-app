import { LEGAL_DOMAIN } from "@/data/legal";
import {
  readPullToRefreshEnvironment,
  type PullToRefreshEnvironment,
} from "@/lib/pullToRefresh";

export type AndroidAppDownloadEnvironment = PullToRefreshEnvironment & {
  userAgent: string;
};

function readAndroidAppDownloadEnvironment(): AndroidAppDownloadEnvironment {
  return {
    ...readPullToRefreshEnvironment(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

function isAndroidDownloadDevPreview(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "development";
}

/** Android browser tab, installed PWA, or dev preview — not the native APK shell. */
export function shouldShowAndroidAppDownload(
  env: AndroidAppDownloadEnvironment = readAndroidAppDownloadEnvironment(),
  options: { isDevelopment?: boolean } = {},
): boolean {
  const isDevelopment =
    options.isDevelopment ?? isAndroidDownloadDevPreview();

  if (env.isNativePlatform()) return false;
  if (isDevelopment) return true;
  return isAndroidUserAgent(env.userAgent);
}

/** Served from `public/downloads/myexercise.apk` after `npm run android:apk`. */
const ANDROID_APP_DOWNLOAD_PATH = "/downloads/myexercise.apk";

export function resolveAndroidAppDownloadUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL?.trim();
  if (configured) return configured;
  return ANDROID_APP_DOWNLOAD_PATH;
}

export function resolveAndroidAppDownloadAbsoluteUrl(): string {
  const url = resolveAndroidAppDownloadUrl();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${LEGAL_DOMAIN}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Open or download the hosted APK. Native uses the WebView download handler. */
export async function openAndroidApkDownload(
  downloadUrl: string = resolveAndroidAppDownloadAbsoluteUrl(),
): Promise<void> {
  if (typeof window === "undefined") return;

  const { isNativePlatform } = await import("@/lib/capacitorRuntime");
  if (isNativePlatform()) {
    triggerNativeApkDownload(downloadUrl);
    return;
  }

  window.location.assign(downloadUrl);
}

function triggerNativeApkDownload(downloadUrl: string): void {
  // Handed off to MainActivity's DownloadListener (system DownloadManager).
  window.location.assign(downloadUrl);
}
