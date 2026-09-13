import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const fixture = fileURLToPath(new URL("../fixtures/eslint/type-escapes.ts", import.meta.url));

describe("eslint.config.js", () => {
  it("reports every banned type escape even under an inline disable comment", async () => {
    const eslint = new ESLint({ cwd: repoRoot, ignore: false });
    const results = await eslint.lintFiles([fixture]);
    const banned = results
      .flatMap((result) => result.messages)
      .filter((message) => message.ruleId === "no-restricted-syntax")
      .map((message) => `${String(message.line)}: ${message.message}`);

    expect(banned).toEqual([
      "5: `any` is banned. Model the type or parse the value with zod.",
      "7: `unknown` is banned. Model the type or parse the value with zod.",
      "11: Type assertions (`as`) are banned. Use a type guard, `satisfies` or a zod schema.",
      "13: Angle-bracket type assertions are banned. Use a type guard, `satisfies` or a zod schema.",
      "15: Type assertions (`as`) are banned. Use a type guard, `satisfies` or a zod schema.",
      "18: Non-null assertions (`!`) are banned. Narrow the value instead.",
    ]);
  }, 60_000);
});
