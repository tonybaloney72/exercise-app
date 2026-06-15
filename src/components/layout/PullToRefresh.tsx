"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { refreshAppData } from "@/lib/refreshAppData";
import { shouldEnablePullToRefresh } from "@/lib/pullToRefresh";

const THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

function scrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function isPullBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '[role="dialog"], [data-pull-to-refresh="off"], input, textarea, select',
    ),
  );
}

export default function PullToRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullPxRef = useRef(0);
  const trackingRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    setEnabled(shouldEnablePullToRefresh());
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    setRefreshing(true);
    setPullPx(THRESHOLD_PX);
    pullPxRef.current = THRESHOLD_PX;
    try {
      await refreshAppData();
      router.refresh();
    } catch (err) {
      console.error("[PullToRefresh]", err);
    } finally {
      setRefreshing(false);
      setPullPx(0);
      pullPxRef.current = 0;
      trackingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(event: TouchEvent) {
      if (
        refreshingRef.current ||
        scrollTop() > 0 ||
        isPullBlockedTarget(event.target)
      ) {
        trackingRef.current = false;
        return;
      }
      startYRef.current = event.touches[0]?.clientY ?? 0;
      trackingRef.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!trackingRef.current || refreshingRef.current) return;
      if (scrollTop() > 0) {
        trackingRef.current = false;
        pullPxRef.current = 0;
        setPullPx(0);
        return;
      }

      const y = event.touches[0]?.clientY ?? startYRef.current;
      const delta = y - startYRef.current;
      if (delta <= 0) {
        pullPxRef.current = 0;
        setPullPx(0);
        return;
      }

      event.preventDefault();
      const next = Math.min(delta, MAX_PULL_PX);
      pullPxRef.current = next;
      setPullPx(next);
    }

    function onTouchEnd() {
      if (!trackingRef.current || refreshingRef.current) return;
      const shouldRefresh = pullPxRef.current >= THRESHOLD_PX;
      trackingRef.current = false;
      if (shouldRefresh) {
        void runRefresh();
        return;
      }
      pullPxRef.current = 0;
      setPullPx(0);
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, runRefresh]);

  if (!enabled) return null;

  const active = pullPx > 0 || refreshing;
  const ready = pullPx >= THRESHOLD_PX;
  const label = refreshing
    ? "Refreshing…"
    : ready
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center transition-opacity duration-150"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        opacity: active ? 1 : 0,
        transform: `translateY(${Math.min(pullPx * 0.45, 48)}px)`,
      }}
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium text-muted shadow-lg backdrop-blur-sm">
        <span
          className={`inline-block h-4 w-4 rounded-full border-2 border-accent border-t-transparent ${
            refreshing ? "animate-spin" : ""
          }`}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${ready ? 180 : pullPx * 3}deg)` }
          }
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
