"use client";

import { useEffect, useRef } from "react";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { probeNativeHealthBridgeOnStartup } from "@/lib/health/nativeHealth";

/** Eagerly registers the Capacitor Health plugin when the native shell loads. */
export default function NativeHealthBridgeInit() {
  const ran = useRef(false);

  useEffect(() => {
    if (!isNativePlatform() || ran.current) return;
    ran.current = true;
    void probeNativeHealthBridgeOnStartup();
  }, []);

  return null;
}
