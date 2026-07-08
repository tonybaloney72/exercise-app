"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  checkNativeNotificationPermission,
  openNativeAppSettings,
  openNativeNotificationSettings,
  requestNativeNotificationPermission,
} from "@/lib/device/openAppSettings";
import {
  CARDIO_HEALTH_READ_TYPES,
  checkNativeHealthAuthorization,
  openNativeHealthSettings,
} from "@/lib/health/nativeHealth";
import { ensureCardioHealthReadAccess } from "@/lib/health";
import {
  checkNativeLocationPermission,
  openNativeLocationSettings,
  requestNativeLocationPermission,
} from "@/lib/geo/openLocationSettings";

type HealthAccessState = "unknown" | "granted" | "denied";

const SETTINGS_REFRESH_MS = 1500;

export default function CardioPermissionsSection() {
  const [healthAccess, setHealthAccess] =
    useState<HealthAccessState>("unknown");
  const [backgroundReadGranted, setBackgroundReadGranted] = useState<
    boolean | null
  >(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<
    boolean | null
  >(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  const refreshHealthAccess = useCallback(async () => {
    const status = await checkNativeHealthAuthorization({
      read: CARDIO_HEALTH_READ_TYPES,
      write: [],
    });
    const granted = (status?.readAuthorized.length ?? 0) > 0;
    setHealthAccess(granted ? "granted" : "denied");
    setBackgroundReadGranted(status?.backgroundReadGranted ?? null);
  }, []);

  const refreshLocationAccess = useCallback(async () => {
    setLocationGranted(await checkNativeLocationPermission());
  }, []);

  const refreshNotificationAccess = useCallback(async () => {
    setNotificationsGranted(await checkNativeNotificationPermission());
  }, []);

  useEffect(() => {
    void refreshHealthAccess();
    void refreshLocationAccess();
    void refreshNotificationAccess();
  }, [refreshHealthAccess, refreshLocationAccess, refreshNotificationAccess]);

  async function handleConnectHealth() {
    setHealthBusy(true);
    try {
      const granted = await ensureCardioHealthReadAccess();
      await refreshHealthAccess();
      if (granted) {
        toast.success("Health Connect access granted");
      } else {
        toast.error(
          "Health Connect did not grant access. Open settings below to allow MyExercise.",
        );
      }
    } finally {
      setHealthBusy(false);
    }
  }

  async function handleOpenHealthSettings() {
    const opened = await openNativeHealthSettings();
    if (!opened) {
      toast.error(
        "Could not open Health Connect. Try Settings → Apps → Health Connect.",
      );
      return;
    }
    window.setTimeout(() => void refreshHealthAccess(), SETTINGS_REFRESH_MS);
  }

  async function handleRequestLocation() {
    setLocationBusy(true);
    try {
      const granted = await requestNativeLocationPermission();
      setLocationGranted(granted);
      if (granted) {
        toast.success("Location access granted");
      } else {
        toast.message(
          "Location was not granted. Use App permissions below if you previously chose Don't ask again.",
        );
      }
    } finally {
      setLocationBusy(false);
    }
  }

  async function handleOpenLocationSettings() {
    const opened = await openNativeLocationSettings();
    if (!opened) {
      toast.error("Could not open system location settings.");
      return;
    }
    window.setTimeout(() => void refreshLocationAccess(), SETTINGS_REFRESH_MS);
  }

  async function handleOpenAppSettings() {
    const opened = await openNativeAppSettings();
    if (!opened) {
      toast.error("Could not open MyExercise app settings.");
      return;
    }
    window.setTimeout(() => {
      void refreshLocationAccess();
      void refreshNotificationAccess();
    }, SETTINGS_REFRESH_MS);
  }

  async function handleRequestNotifications() {
    setNotificationBusy(true);
    try {
      const granted = await requestNativeNotificationPermission();
      setNotificationsGranted(granted);
      if (granted) {
        toast.success("Notifications allowed");
      } else {
        toast.message(
          "Notifications were not allowed. Open notification settings below to enable timer alerts.",
        );
      }
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleOpenNotificationSettings() {
    const opened = await openNativeNotificationSettings();
    if (!opened) {
      toast.error("Could not open notification settings.");
      return;
    }
    window.setTimeout(
      () => void refreshNotificationAccess(),
      SETTINGS_REFRESH_MS,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted leading-relaxed">
        Pull steps, calories, heart rate, sleep, routes, and other data from
        Health Connect. Finished workouts and logged activities can be saved back
        as exercise sessions. Background read lets daily metrics refresh when you
        return to the app without reconnecting.
      </p>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-hover/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              Health Connect
            </p>
            {backgroundReadGranted != null ? (
              <p className="text-xs text-muted mt-0.5">
                Background updates:{" "}
                {backgroundReadGranted ? "allowed" : "not allowed"}
              </p>
            ) : null}
          </div>
          <HealthStatusBadge state={healthAccess} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => void handleConnectHealth()}
            disabled={healthBusy}
          >
            {healthBusy ? "Connecting…" : "Connect Health Connect"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => void handleOpenHealthSettings()}
          >
            Open Health Connect settings
          </ActionButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-hover/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              Location (GPS)
            </p>
            <p className="text-xs text-muted mt-0.5">
              Track distance while the app is open.
            </p>
          </div>
          <PermissionBadge granted={locationGranted} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => void handleRequestLocation()}
            disabled={locationBusy}
          >
            {locationBusy ? "Requesting…" : "Allow location access"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => void handleOpenAppSettings()}
          >
            App permissions
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => void handleOpenLocationSettings()}
          >
            System location
          </ActionButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-hover/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              Notifications
            </p>
            <p className="text-xs text-muted mt-0.5">
              Rest and set timer alerts when the app is in the background.
            </p>
          </div>
          <PermissionBadge granted={notificationsGranted} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => void handleRequestNotifications()}
            disabled={notificationBusy}
          >
            {notificationBusy ? "Requesting…" : "Allow notifications"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => void handleOpenNotificationSettings()}
          >
            Notification settings
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function HealthStatusBadge({ state }: { state: HealthAccessState }) {
  if (state === "unknown") {
    return (
      <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Checking…
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        state === "granted"
          ? "bg-green-500/15 text-green-400"
          : "bg-amber-500/15 text-amber-400"
      }`}
    >
      {state === "granted" ? "Connected" : "Not connected"}
    </span>
  );
}

function PermissionBadge({ granted }: { granted: boolean | null }) {
  if (granted == null) {
    return (
      <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Checking…
      </span>
    );
  }
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        granted
          ? "bg-green-500/15 text-green-400"
          : "bg-amber-500/15 text-amber-400"
      }`}
    >
      {granted ? "Allowed" : "Denied"}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const base =
    variant === "primary"
      ? "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/20"
      : "border-border bg-background text-foreground hover:border-accent/30";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${base}`}
    >
      {children}
    </button>
  );
}
