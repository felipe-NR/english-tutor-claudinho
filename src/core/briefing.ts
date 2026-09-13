import { CATEGORY_FOCUS, type CorrectionCategory } from "./model.ts";
import type { CorrectionRecord } from "./model.ts";
import { computeStats, type PatternStat } from "./stats.ts";

const DEFAULT_LIMIT = 3;

export type Trend = "new" | "up" | "down" | "flat";

export interface Briefing {
  readonly total: number;
  readonly last7Days: number;
  readonly trend: Trend;
  readonly topPatterns: readonly PatternStat[];
  readonly focus: readonly CorrectionCategory[];
  readonly text: string;
}

// Build the session briefing: the main weaknesses, the 7-day trend and a
// suggested focus, capped to `limit` patterns to stay within the token budget
// (plan §4.11).
export function buildBriefing(records: readonly CorrectionRecord[], limit = DEFAULT_LIMIT, now?: Date): Briefing {
  const stats = computeStats(records, now);
  const topPatterns = stats.patterns.slice(0, limit);
  const focus = stats.byCategory.slice(0, limit).map((entry) => entry.category);
  const trend = resolveTrend(stats.total, stats.last7Days, stats.previous7Days);
  return {
    total: stats.total,
    last7Days: stats.last7Days,
    trend,
    topPatterns,
    focus,
    text: renderBriefing(stats.total, stats.last7Days, trend, topPatterns, focus),
  };
}

// The one-line focus for the per-message reminder, in English because the model
// is the reader.
export function focusLine(focus: readonly CorrectionCategory[]): string {
  if (focus.length === 0) {
    return "[english-tutor] Apply the correction protocol to this message.";
  }
  const phrases = focus.map((category) => CATEGORY_FOCUS[category]).join(", ");
  return `[english-tutor] Apply the correction protocol to this message. Focus: ${phrases}.`;
}

function resolveTrend(total: number, last7Days: number, previous7Days: number): Trend {
  if (total === 0) {
    return "new";
  }
  if (last7Days > previous7Days) {
    return "up";
  }
  if (last7Days < previous7Days) {
    return "down";
  }
  return "flat";
}

function renderBriefing(
  total: number,
  last7Days: number,
  trend: Trend,
  topPatterns: readonly PatternStat[],
  focus: readonly CorrectionCategory[],
): string {
  if (total === 0) {
    return "[english-tutor] No recorded mistakes yet. Corrections start once you write.";
  }
  const lines = [`[english-tutor] ${String(total)} mistakes recorded, ${String(last7Days)} in the last 7 days (${trend}).`];
  if (topPatterns.length > 0) {
    lines.push("Top patterns:");
    for (const pattern of topPatterns) {
      lines.push(`- [${pattern.category}] ${pattern.original} → ${pattern.correction} (${String(pattern.count)}x)`);
    }
  }
  lines.push(focusLine(focus));
  return lines.join("\n");
}
