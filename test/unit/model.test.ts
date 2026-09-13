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
