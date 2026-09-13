import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claimOnce } from "../../src/core/state.ts";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "et-state-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("claimOnce", () => {
  it("returns true only for the first claim of a key", async () => {
    expect(await claimOnce(dir, "reminder-abc")).toBe(true);
    expect(await claimOnce(dir, "reminder-abc")).toBe(false);
  });

  it("tracks distinct keys independently", async () => {
    expect(await claimOnce(dir, "reminder-one")).toBe(true);
    expect(await claimOnce(dir, "reminder-two")).toBe(true);
  });

  it("resolves concurrent claims of one key to a single winner", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => claimOnce(dir, "reminder-race")));
    expect(results.filter((won) => won)).toHaveLength(1);
  });
});
