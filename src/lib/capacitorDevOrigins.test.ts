import { describe, expect, it } from "vitest";
import { resolveCapacitorDevOrigins } from "@/lib/capacitorDevOrigins";

describe("resolveCapacitorDevOrigins", () => {
  it("includes default Android emulator hostnames", () => {
    expect(resolveCapacitorDevOrigins()).toContain("10.0.2.2");
  });

  it("parses CAPACITOR_SERVER_URL and CAPACITOR_DEV_HOSTS", () => {
    const prevServer = process.env.CAPACITOR_SERVER_URL;
    const prevHosts = process.env.CAPACITOR_DEV_HOSTS;
    process.env.CAPACITOR_SERVER_URL = "http://192.168.1.50:3000";
    process.env.CAPACITOR_DEV_HOSTS = "192.168.1.51,http://192.168.1.52:3000";

    try {
      const origins = resolveCapacitorDevOrigins();
      expect(origins).toContain("192.168.1.50");
      expect(origins).toContain("192.168.1.51");
      expect(origins).toContain("192.168.1.52");
    } finally {
      if (prevServer === undefined) delete process.env.CAPACITOR_SERVER_URL;
      else process.env.CAPACITOR_SERVER_URL = prevServer;
      if (prevHosts === undefined) delete process.env.CAPACITOR_DEV_HOSTS;
      else process.env.CAPACITOR_DEV_HOSTS = prevHosts;
    }
  });
});
