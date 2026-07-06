"use client";

import { Toaster } from "sonner";
import { useEffectiveDarkMode } from "@/hooks/useEffectiveDarkMode";

export default function AppToaster() {
  const isDark = useEffectiveDarkMode();

  return (
    <Toaster
      position="top-center"
      theme={isDark ? "dark" : "light"}
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
