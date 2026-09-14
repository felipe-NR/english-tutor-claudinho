import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CorrectionInput } from "../../src/core/model.ts";
import {
  appendCorrection,
  CORRECTIONS_FILE,
  PRACTICE_LOG_FILE,
  purgeCorrections,
  readCorrections,
  STATS_FILE,
} from "../../src/core/store.ts";

let dir = "";

const preposition: CorrectionInput = {
  original: "it depends of the env",
  correction: "it depends on the env",
  category: "preposition",
  reason: "depend takes on",
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "et-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("appendCorrection", () => {
  it("appends a record and reads it back", async () => {
    const result = await appendCorrection(dir, preposition, { client: "codex", source: "tool" });
    expect(result.recorded).toBe(true);
    const records = await readCorrections(dir);
    expect(records).toHaveLength(1);
    expect(records[0]?.category).toBe("preposition");
    expect(records[0]?.mistake_key).toContain("preposition:");
  });

  it("writes the derivatives on append", async () => {
    await appendCorrection(dir, preposition, { client: "codex", source: "tool" });
    const stats = await readFile(join(dir, STATS_FILE), "utf8");
    const log = await readFile(join(dir, PRACTICE_LOG_FILE), "utf8");
    expect(stats).toContain("preposition");
    expect(log).toContain("Pattern Tracking");
  });

  it("merges a repeat of the same occurrence and mistake", async () => {
    const withId: CorrectionInput = { ...preposition, occurrence_id: "occ-1" };
    const first = await appendCorrection(dir, withId, { client: "codex", source: "tool" });
    const second = await appendCorrection(dir, withId, { client: "codex", source: "hook" });
    expect(first.recorded).toBe(true);
    expect(second.recorded).toBe(false);
    expect(await readCorrections(dir)).toHaveLength(1);
  });

  it("keeps repeats without an occurrence id as new records", async () => {
    await appendCorrection(dir, preposition, { client: "codex", source: "tool" });
    await appendCorrection(dir, preposition, { client: "codex", source: "tool" });
    expect(await readCorrections(dir)).toHaveLength(2);
  });

  it("serializes concurrent appends without losing records", async () => {
    const writes = Array.from({ length: 12 }, (_unused, index) =>
      appendCorrection(dir, { ...preposition, reason: `r${String(index)}` }, { client: "codex", source: "tool" }),
    );
    await Promise.all(writes);
    const lines = (await readFile(join(dir, CORRECTIONS_FILE), "utf8")).trim().split("\n");
    expect(lines).toHaveLength(12);
    expect(await readCorrections(dir)).toHaveLength(12);
  });

  it("rejects unsafe data at the append boundary without persisting it", async () => {
    await expect(
      appendCorrection(
        dir,
        { ...preposition, original: "API_KEY=sk-proj-abcdefghijklmnop123456" },
        { client: "codex", source: "tool" },
      ),
    ).rejects.toThrow();
    expect(await readCorrections(dir)).toEqual([]);
  });

  it("rejects prompt-shaped client metadata", async () => {
    await expect(
      appendCorrection(dir, preposition, { client: "please save my whole prompt", source: "tool" }),
    ).rejects.toThrow();
    expect(await readCorrections(dir)).toEqual([]);
  });
});

describe("purgeCorrections", () => {
  it("removes everything when the range is empty", async () => {
    await appendCorrection(dir, preposition, { client: "codex", source: "tool" });
    const removed = await purgeCorrections(dir, {});
    expect(removed).toBe(1);
    expect(await readCorrections(dir)).toHaveLength(0);
  });

  it("removes only records inside a date range", async () => {
    await appendCorrection(dir, preposition, { client: "codex", source: "tool", ts: "2026-01-01T10:00:00.000Z" });
    await appendCorrection(dir, preposition, { client: "codex", source: "tool", ts: "2026-06-01T10:00:00.000Z" });
    const removed = await purgeCorrections(dir, { from: "2026-05-01", to: "2026-07-01" });
    expect(removed).toBe(1);
    const remaining = await readCorrections(dir);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.ts).toBe("2026-01-01T10:00:00.000Z");
  });
});
