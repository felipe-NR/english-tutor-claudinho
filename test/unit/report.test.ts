import { describe, expect, it } from "vitest";
import { type CorrectionRecord, mistakeKey } from "../../src/core/model.ts";
import { renderReport } from "../../src/core/report.ts";

function rec(ts: string, original = "it depends of", correction = "it depends on"): CorrectionRecord {
  return {
    id: ts,
    mistake_key: mistakeKey("preposition", original, correction),
    ts,
    client: "codex",
    category: "preposition",
    original,
    correction,
    reason: "depend takes on",
    source: "tool",
  };
}

const now = new Date("2026-09-13T12:00:00.000Z");

describe("renderReport", () => {
  it("renders the Pattern Tracking table and the Daily Log", () => {
    const md = renderReport([rec("2026-09-13T10:00:00.000Z")], "all", now);
    expect(md).toContain("## Pattern Tracking");
    expect(md).toContain("| Category | Pattern | Count | Last seen |");
    expect(md).toContain("## Daily Log");
    expect(md).toContain('✏️ [preposition] "it depends of" → "it depends on"');
  });

  it("filters to today for the day period", () => {
    const md = renderReport(
      [rec("2026-09-13T10:00:00.000Z"), rec("2026-09-01T10:00:00.000Z")],
      "day",
      now,
    );
    expect(md).toContain("1 recorded");
    expect(md).not.toContain("### 2026-09-01");
  });

  it("reports an empty period cleanly", () => {
    const md = renderReport([], "all", now);
    expect(md).toContain("No mistakes recorded for this period.");
  });

  it("escapes pipes so a fragment cannot break the table", () => {
    const md = renderReport([rec("2026-09-13T10:00:00.000Z", "a | b", "c")], "all", now);
    expect(md).toContain("a \\| b");
  });
});
