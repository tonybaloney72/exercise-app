"use client";

import { useEffect } from "react";
import { registerPlanGeneratorInputsStoreReader } from "@/lib/planGeneratorInputs";
import { tryLoadGeneratorInputsFromStores } from "@/adapters/planGeneratorInputsFromStores";

/** Wires hydrated Zustand settings into `loadGeneratorInputs` without import cycles. */
export default function PlanGeneratorInputsSync() {
  useEffect(() => {
    registerPlanGeneratorInputsStoreReader(tryLoadGeneratorInputsFromStores);
  }, []);

  return null;
}
