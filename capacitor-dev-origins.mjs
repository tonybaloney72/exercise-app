/** Hostnames allowed to load Next.js dev assets (Android emulator, physical device, etc.). */
export function resolveCapacitorDevOrigins() {
  const hosts = new Set([
    "10.0.2.2", // Android emulator → host loopback
    "10.0.3.2", // Genymotion emulator → host loopback
  ]);

  for (const entry of process.env.CAPACITOR_DEV_HOSTS?.split(",") ?? []) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      hosts.add(trimmed.includes("://") ? new URL(trimmed).hostname : trimmed);
    } catch {
      hosts.add(trimmed);
    }
  }

  const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
  if (serverUrl) {
    try {
      hosts.add(new URL(serverUrl).hostname);
    } catch {
      /* ignore invalid URL */
    }
  }

  return [...hosts];
}
