import {
  isStandaloneWebApp,
  readPullToRefreshEnvironment,
  type PullToRefreshEnvironment,
} from "@/lib/pullToRefresh";

export type AndroidAppDownloadEnvironment = PullToRefreshEnvironment & {
  userAgent: string;
};

export function readAndroidAppDownloadEnvironment(): AndroidAppDownloadEnvironment {
  return {
    ...readPullToRefreshEnvironment(),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

export function isAndroidUserAgent(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

export function isAndroidDownloadDevPreview(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "development";
}

/** Installed PWA on Android — not the native APK or a normal browser tab. */
export function shouldShowAndroidAppDownload(
  env: AndroidAppDownloadEnvironment = readAndroidAppDownloadEnvironment(),
  options: { isDevelopment?: boolean } = {},
): boolean {
  const isDevelopment =
    options.isDevelopment ?? isAndroidDownloadDevPreview();

  if (env.isNativePlatform()) return false;
  if (isDevelopment) return true;
  if (!isStandaloneWebApp(env)) return false;
  return isAndroidUserAgent(env.userAgent);
}

export function resolveAndroidAppDownloadUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ANDROID_APP_DOWNLOAD_URL?.trim();
  if (configured) return configured;
  return "/download/android";
}
