import { describe, it } from "vitest";
import { writeFileSync } from "fs";
import { join } from "path";
import {
  buildWeekAuditReport,
  formatWeekAuditReport,
} from "@/lib/generateWeekAudit";

/** npm run generate-week-audit */
describe("generateWeekAudit export", () => {
  it("exports week-audit.json to project root", () => {
    const report = buildWeekAuditReport();
    const out = join(process.cwd(), "week-audit.json");
    writeFileSync(out, formatWeekAuditReport(report), "utf8");

    console.log(`\nWrote ${out}\n`);
    console.log("Summary:", report.summary);
    if (report.stretchRepeatsAcrossWeek.length > 0) {
      console.log("\nStretch repeats across week (top 15):");
      console.table(report.stretchRepeatsAcrossWeek.slice(0, 15));
    } else {
      console.log("\nNo stretch ids repeated across days in this seed.");
    }
    if (report.summary.enduranceIdsInRounds.length > 0) {
      console.warn("END-* in rounds:", report.summary.enduranceIdsInRounds);
    }
  });
});
