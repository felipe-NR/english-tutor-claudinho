import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VERSION } from "../../src/version.ts";

const bundle = fileURLToPath(new URL("../../plugin/dist/tutor.mjs", import.meta.url));

describe("committed bundle", () => {
  it("runs under the current Node.js and prints the version", () => {
    const stdout = execFileSync(process.execPath, [bundle, "--version"], { encoding: "utf8" });
    expect(stdout).toBe(`${VERSION}\n`);
  });
});
