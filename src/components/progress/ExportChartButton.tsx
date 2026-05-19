"use client";

import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { chartImageFilename, downloadChartAsPng } from "@/utils/exportChartImage";

type Props = {
  containerRef: RefObject<HTMLElement | null>;
  filename: string;
  disabled?: boolean;
};

export default function ExportChartButton({
  containerRef,
  filename,
  disabled = false,
}: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    const container = containerRef.current;
    if (!container || disabled || exporting) return;

    setExporting(true);
    try {
      await downloadChartAsPng(container, chartImageFilename(filename));
      toast.success("Chart saved", {
        description: chartImageFilename(filename),
        duration: 3000,
      });
    } catch (err) {
      console.error("[ExportChartButton]", err);
      toast.error("Couldn't export chart", {
        description: "Try again in a moment.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={disabled || exporting}
      aria-label={`Save ${filename} chart as PNG`}
      className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {exporting ? "Saving…" : "Save image"}
    </button>
  );
}
