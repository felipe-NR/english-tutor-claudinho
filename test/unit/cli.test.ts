import { describe, expect, it } from "vitest";
import { run } from "../../src/cli.ts";
import { VERSION } from "../../src/version.ts";

describe("run", () => {
  it("prints the version", () => {
    expect(run(["--version"])).toEqual({ exitCode: 0, stdout: `${VERSION}\n`, stderr: "" });
  });

  it("prints usage when no command is given", () => {
    const result = run([]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage: tutor <command>");
  });

  it("rejects an unknown command with exit code 2", () => {
    const result = run(["nope"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('unknown command "nope"');
  });
});
