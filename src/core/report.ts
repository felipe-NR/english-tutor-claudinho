import { z } from "zod";
import type { CorrectionRecord } from "./model.ts";
import { computeStats } from "./stats.ts";

export const ReportPeriod = z.enum(["day", "week", "all"]);
export type ReportPeriod = z.infer<typeof ReportPeriod>;

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_TITLE: Record<ReportPeriod, string> = {
  day: "Today",
  week: "Last 7 days",
  all: "All time",
};

// Render the Markdown report: a Pattern Tracking table and a Daily Log, filtered
// by period. The `all` period is also the persisted practice log.
export function renderReport(records: readonly CorrectionRecord[], period: ReportPeriod, now: Date = new Date()): string {
  const selected = filterByPeriod(records, period, now);
  const stats = computeStats(selected, now);
  const lines = [`# English practice log`, "", `_${PERIOD_TITLE[period]} — ${String(stats.total)} recorded._`, ""];

  lines.push("## Pattern Tracking", "");
  if (stats.patterns.length === 0) {
    lines.push("No mistakes recorded for this period.", "");
  } else {
    lines.push("| Category | Pattern | Count | Last seen |", "|-|-|-|-|");
    for (const pattern of stats.patterns) {
      const shape = `${escapeCell(pattern.original)} → ${escapeCell(pattern.correction)}`;
      lines.push(`| ${pattern.category} | ${shape} | ${String(pattern.count)} | ${pattern.lastSeen.slice(0, 10)} |`);
    }
    lines.push("");
  }

  lines.push("## Daily Log", "");
  lines.push(...renderDailyLog(selected));
  return `${lines.join("\n").trimEnd()}\n`;
}

function renderDailyLog(records: readonly CorrectionRecord[]): string[] {
  if (records.length === 0) {
    return ["No entries for this period."];
  }
  const byDay = new Map<string, CorrectionRecord[]>();
  for (const record of records) {
    const day = record.ts.slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket === undefined) {
      byDay.set(day, [record]);
    } else {
      bucket.push(record);
    }
  }

  const lines: string[] = [];
  for (const day of [...byDay.keys()].sort((a, b) => b.localeCompare(a))) {
    lines.push(`### ${day}`, "");
    for (const record of byDay.get(day) ?? []) {
      lines.push(`✏️ [${record.category}] "${record.original}" → "${record.correction}" (${record.reason})`);
    }
    lines.push("");
  }
  return lines;
}

function filterByPeriod(records: readonly CorrectionRecord[], period: ReportPeriod, now: Date): CorrectionRecord[] {
  if (period === "all") {
    return [...records];
  }
  if (period === "day") {
    const today = now.toISOString().slice(0, 10);
    return records.filter((record) => record.ts.slice(0, 10) === today);
  }
  const cutoff = now.getTime() - 7 * DAY_MS;
  return records.filter((record) => {
    const time = Date.parse(record.ts);
    return !Number.isNaN(time) && time >= cutoff;
  });
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
