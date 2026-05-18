"use client";

import { Toaster } from "sonner";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function AppToaster() {
  const darkMode = useSettingsStore((s) => s.darkMode);

  return (
    <Toaster
      position="top-center"
      theme={darkMode ? "dark" : "light"}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm !rounded-xl",
        },
      }}
    />
  );
}
