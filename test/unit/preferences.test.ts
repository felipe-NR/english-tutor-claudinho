import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultPreferences, readPreferences, updatePreferences } from "../../src/core/preferences.ts";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "et-prefs-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("preferences", () => {
  it("returns defaults when no config exists", async () => {
    expect(await readPreferences(dir)).toEqual(defaultPreferences());
  });

  it("applies a partial update and persists it", async () => {
    const next = await updatePreferences(dir, { strictness: "strict" });
    expect(next.strictness).toBe("strict");
    expect(next.explanation_language).toBe("en-with-pt-notes");
    expect(await readPreferences(dir)).toEqual(next);
  });

  it("sets and clears a pause", async () => {
    const paused = await updatePreferences(dir, { paused_until: "2026-09-14T00:00:00.000Z" });
    expect(paused.paused_until).toBe("2026-09-14T00:00:00.000Z");
    const resumed = await updatePreferences(dir, { paused_until: "" });
    expect(resumed.paused_until).toBeUndefined();
  });

  it("falls back to defaults for a corrupt config", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(dir, "config.json"), "{ not json", "utf8");
    expect(await readPreferences(dir)).toEqual(defaultPreferences());
  });
});
