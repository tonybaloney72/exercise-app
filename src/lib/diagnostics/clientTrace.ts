import { getClientBuildId } from "@/lib/appVersion";
import { isNativePlatform } from "@/lib/capacitorRuntime";

export type TraceLevel = "info" | "warn" | "error";

export type TraceEntry = {
  ts: string;
  scope: string;
  event: string;
  level: TraceLevel;
  data?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
};

const MAX_ENTRIES = 250;
const STORAGE_KEY = "exercise-app-client-trace-v1";
const SENSITIVE_KEY =
  /token|password|authorization|cookie|secret|bearer|api[_-]?key|refresh/i;

let buffer: TraceEntry[] = [];
let bufferLoaded = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadBuffer(): TraceEntry[] {
  if (bufferLoaded) return buffer;
  bufferLoaded = true;
  if (!isBrowser()) return buffer;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return buffer;
    const parsed = JSON.parse(raw) as TraceEntry[];
    buffer = Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    buffer = [];
  }
  return buffer;
}

function persistBuffer(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // Quota or private mode — in-memory buffer still works this session.
  }
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }
  const out: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    out[childKey] = redactValue(childKey, childValue);
  }
  return out;
}

function redactData(
  data?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  return redactValue("root", data) as Record<string, unknown>;
}

function pushEntry(entry: TraceEntry): void {
  loadBuffer();
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer = buffer.slice(-MAX_ENTRIES);
  }
  persistBuffer();
  if (process.env.NODE_ENV === "development") {
    const suffix = entry.error
      ? ` error=${entry.error}`
      : entry.durationMs != null
        ? ` ${entry.durationMs}ms`
        : "";
    console.debug(`[trace:${entry.scope}] ${entry.event}${suffix}`, entry.data);
  }
}

/** Append a diagnostic event (ring buffer + sessionStorage). */
export function clientTrace(
  scope: string,
  event: string,
  data?: Record<string, unknown>,
  level: TraceLevel = "info",
): void {
  pushEntry({
    ts: new Date().toISOString(),
    scope,
    event,
    level,
    data: redactData(data),
  });
}

/** Time an async operation; logs ok, error, or throw with duration. */
export async function clientTraceAsync<T>(
  scope: string,
  event: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  clientTrace(scope, `${event}_start`, data);
  try {
    const result = await fn();
    clientTrace(scope, `${event}_ok`, {
      ...data,
      durationMs: Date.now() - started,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pushEntry({
      ts: new Date().toISOString(),
      scope,
      event: `${event}_error`,
      level: "error",
      data: redactData(data),
      durationMs: Date.now() - started,
      error: message,
    });
    throw err;
  }
}

export function getClientTraceEntries(): readonly TraceEntry[] {
  return [...loadBuffer()];
}

export function clearClientTrace(): void {
  buffer = [];
  bufferLoaded = true;
  if (isBrowser()) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export type ClientTraceExport = {
  meta: Record<string, unknown>;
  entries: TraceEntry[];
};

export function buildClientTraceExport(
  extraMeta?: Record<string, unknown>,
): ClientTraceExport {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      clientBuildId: getClientBuildId(),
      nativeShell: isNativePlatform(),
      href: isBrowser() ? window.location.href : undefined,
      userAgent: isBrowser() ? navigator.userAgent : undefined,
      ...extraMeta,
    },
    entries: [...getClientTraceEntries()],
  };
}

export function formatClientTraceExport(
  extraMeta?: Record<string, unknown>,
): string {
  return JSON.stringify(buildClientTraceExport(extraMeta), null, 2);
}
