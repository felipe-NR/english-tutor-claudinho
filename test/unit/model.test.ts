import { describe, expect, it } from "vitest";
import { CATEGORY_FOCUS, CorrectionCategory, CorrectionInput, MAX_FRAGMENT_LENGTH, mistakeKey } from "../../src/core/model.ts";

describe("mistakeKey", () => {
  it("collapses whitespace and casing so variants map to one key", () => {
    const a = mistakeKey("preposition", "It Depends  Of", "it depends on");
    const b = mistakeKey("preposition", "it depends of", "IT DEPENDS ON");
    expect(a).toBe(b);
  });

  it("keeps different categories apart", () => {
    expect(mistakeKey("preposition", "a", "b")).not.toBe(mistakeKey("spelling", "a", "b"));
  });
});

describe("CorrectionInput", () => {
  it("trims fragments and accepts a valid correction", () => {
    const parsed = CorrectionInput.parse({
      original: "  I have a doubt  ",
      correction: "I have a question",
      category: "doubt-question",
      reason: "duvida",
    });
    expect(parsed.original).toBe("I have a doubt");
  });

  it("refuses a fragment longer than the limit", () => {
    const result = CorrectionInput.safeParse({
      original: "x".repeat(MAX_FRAGMENT_LENGTH + 1),
      correction: "y",
      category: "spelling",
      reason: "long",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "```ts\\nconst password = process.env.PASSWORD;\\n```",
    "const token = getToken();",
    '{"password":"hunter2"}',
  ])("refuses code-shaped text: %s", (original) => {
    const result = CorrectionInput.safeParse({
      original,
      correction: "safe prose",
      category: "spelling",
      reason: "spelling",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret-value",
    "API_KEY=sk-proj-abcdefghijklmnop123456",
    "AKIAIOSFODNN7EXAMPLE",
    "0123456789abcdef0123456789abcdef",
  ])("refuses secret-shaped text: %s", (original) => {
    const result = CorrectionInput.safeParse({
      original,
      correction: "safe prose",
      category: "spelling",
      reason: "spelling",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "Please inspect the repository, fix all failing tests, update the documentation, and commit the changes.",
    "First inspect the repository. Then change every affected file.",
    "<user>replace the current implementation</user>",
  ])("refuses text shaped like a whole prompt: %s", (original) => {
    const result = CorrectionInput.safeParse({
      original,
      correction: "safe prose",
      category: "spelling",
      reason: "spelling",
    });
    expect(result.success).toBe(false);
  });

  it("applies the privacy filter to the correction and reason too", () => {
    const unsafeCorrection = CorrectionInput.safeParse({
      original: "safe prose",
      correction: "ghp_abcdefghijklmnopqrstuvwxyz123456",
      category: "spelling",
      reason: "spelling",
    });
    const unsafeReason = CorrectionInput.safeParse({
      original: "safe prose",
      correction: "safer prose",
      category: "spelling",
      reason: "password=hunter2",
    });
    expect(unsafeCorrection.success).toBe(false);
    expect(unsafeReason.success).toBe(false);
  });

  it("preserves legitimate short correction fragments", () => {
    const parsed = CorrectionInput.safeParse({
      original: "This function return a value",
      correction: "This function returns a value",
      category: "verb-pattern",
      reason: "Use third-person singular agreement",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = CorrectionInput.safeParse({ original: "a", correction: "b", category: "grammar", reason: "" });
    expect(result.success).toBe(false);
  });
});

describe("CATEGORY_FOCUS", () => {
  it("has a focus phrase for every category", () => {
    for (const category of CorrectionCategory.options) {
      expect(CATEGORY_FOCUS[category]).toBeTruthy();
    }
  });
});
