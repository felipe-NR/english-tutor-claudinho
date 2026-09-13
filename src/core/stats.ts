import type { CorrectionCategory, CorrectionRecord } from "./model.ts";

export interface PatternStat {
  readonly mistake_key: string;
  readonly category: CorrectionCategory;
  readonly original: string;
  readonly correction: string;
  readonly count: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
}

export interface CategoryStat {
  readonly category: CorrectionCategory;
  readonly count: number;
}

export interface Stats {
  readonly total: number;
  readonly patterns: readonly PatternStat[];
  readonly byCategory: readonly CategoryStat[];
  readonly last7Days: number;
  readonly previous7Days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface MutablePattern {
  category: CorrectionCategory;
  original: string;
  correction: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

// Aggregate the append-only records into pattern and category counts. `now`
// anchors the 7-day windows so the result is deterministic in tests.
export function computeStats(records: readonly CorrectionRecord[], now: Date = new Date()): Stats {
  const patterns = new Map<string, MutablePattern>();
  const categories = new Map<CorrectionCategory, number>();
  const cutoff = now.getTime() - 7 * DAY_MS;
  const previousCutoff = now.getTime() - 14 * DAY_MS;
  let last7Days = 0;
  let previous7Days = 0;

  for (const record of records) {
    const existing = patterns.get(record.mistake_key);
    if (existing === undefined) {
      patterns.set(record.mistake_key, {
        category: record.category,
        original: record.original,
        correction: record.correction,
        count: 1,
        firstSeen: record.ts,
        lastSeen: record.ts,
      });
    } else {
      existing.count += 1;
      if (record.ts < existing.firstSeen) {
        existing.firstSeen = record.ts;
      }
      if (record.ts >= existing.lastSeen) {
        existing.lastSeen = record.ts;
        existing.original = record.original;
        existing.correction = record.correction;
      }
    }

    categories.set(record.category, (categories.get(record.category) ?? 0) + 1);

    const time = Date.parse(record.ts);
    if (!Number.isNaN(time)) {
      if (time >= cutoff) {
        last7Days += 1;
      } else if (time >= previousCutoff) {
        previous7Days += 1;
      }
    }
  }

  return {
    total: records.length,
    patterns: sortPatterns(patterns),
    byCategory: sortCategories(categories),
    last7Days,
    previous7Days,
  };
}

function sortPatterns(patterns: ReadonlyMap<string, MutablePattern>): PatternStat[] {
  return [...patterns.entries()]
    .map(([mistake_key, value]) => ({ mistake_key, ...value }))
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen) || a.mistake_key.localeCompare(b.mistake_key));
}

function sortCategories(categories: ReadonlyMap<CorrectionCategory, number>): CategoryStat[] {
  return [...categories.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}
