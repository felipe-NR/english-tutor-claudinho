import { describe, expect, it } from "vitest";
import { buildBriefing, focusLine } from "../../src/core/briefing.ts";
import { type CorrectionCategory, type CorrectionRecord, mistakeKey } from "../../src/core/model.ts";
import { computeStats } from "../../src/core/stats.ts";

interface RecordOverrides {
  readonly category?: CorrectionCategory;
  readonly original?: string;
  readonly correction?: string;
  readonly ts?: string;
}

let counter = 0;

function rec(overrides: RecordOverrides = {}): CorrectionRecord {
  const category = overrides.category ?? "preposition";
  const original = overrides.original ?? "it depends of";
  const correction = overrides.correction ?? "it depends on";
  counter += 1;
  return {
    id: `id-${String(counter)}`,
    mistake_key: mistakeKey(category, original, correction),
    ts: overrides.ts ?? "2026-09-13T10:00:00.000Z",
    client: "codex",
    category,
    original,
    correction,
    reason: "",
    source: "tool",
  };
}

const now = new Date("2026-09-13T12:00:00.000Z");

describe("computeStats", () => {
  it("counts patterns and orders them most frequent first", () => {
    const stats = computeStats([rec(), rec(), rec({ category: "spelling", original: "sucess", correction: "success" })], now);
    expect(stats.total).toBe(3);
    expect(stats.patterns[0]?.count).toBe(2);
    expect(stats.patterns[0]?.category).toBe("preposition");
  });

  it("splits the 7-day windows", () => {
    const stats = computeStats(
      [rec({ ts: "2026-09-12T10:00:00.000Z" }), rec({ ts: "2026-09-03T10:00:00.000Z" })],
      now,
    );
    expect(stats.last7Days).toBe(1);
    expect(stats.previous7Days).toBe(1);
  });
});

describe("buildBriefing", () => {
  it("reports a rising trend and caps the patterns", () => {
    const records = [
      rec({ ts: "2026-09-12T10:00:00.000Z" }),
      rec({ ts: "2026-09-12T11:00:00.000Z" }),
      rec({ category: "spelling", original: "enviroment", correction: "environment", ts: "2026-09-11T10:00:00.000Z" }),
    ];
    const briefing = buildBriefing(records, 1, now);
    expect(briefing.trend).toBe("up");
    expect(briefing.topPatterns).toHaveLength(1);
    expect(briefing.text).toContain("[english-tutor]");
  });

  it("says nothing recorded when the store is empty", () => {
    const briefing = buildBriefing([], 3, now);
    expect(briefing.trend).toBe("new");
    expect(briefing.text).toContain("No recorded mistakes");
  });
});

describe("focusLine", () => {
  it("names the focus categories in English", () => {
    expect(focusLine(["preposition", "doubt-question"])).toContain("verb + preposition");
  });

  it("falls back to a bare reminder with no focus", () => {
    expect(focusLine([])).toBe("[english-tutor] Apply the correction protocol to this message.");
  });
});
