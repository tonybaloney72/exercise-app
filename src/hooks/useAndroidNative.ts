import { useEffect, useState } from "react";
import { isAndroidNative } from "@/lib/capacitorRuntime";

/** Android shell detection safe for SSR (false until after mount). */
export function useAndroidNative(): boolean {
  const [androidNative, setAndroidNative] = useState(false);

  useEffect(() => {
    setAndroidNative(isAndroidNative());
  }, []);

  return androidNative;
}
