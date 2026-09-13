import { describe, expect, it } from "vitest";
import { occurrenceId, parseCorrectionLines } from "../../src/core/protocol.ts";

describe("parseCorrectionLines", () => {
  it("extracts the categories, fragments and reasons from marked lines", () => {
    const message = [
      "Here is your fix.",
      '✏️ [preposition] "it depends of the env" → "it depends on the env" (depend takes on)',
      '✏️ [doubt-question] "I have a doubt" -> "I have a question" (for "dúvida", use question)',
    ].join("\n");
    const corrections = parseCorrectionLines(message);
    expect(corrections).toHaveLength(2);
    expect(corrections[0]?.category).toBe("preposition");
    expect(corrections[1]?.correction).toBe("I have a question");
  });

  it("ignores an unknown category and an over-long fragment", () => {
    const message = [
      '✏️ [grammar] "a" → "b" (not a category)',
      `✏️ [spelling] "${"x".repeat(200)}" → "y" (too long)`,
    ].join("\n");
    expect(parseCorrectionLines(message)).toEqual([]);
  });

  it("returns nothing for a message with no marker", () => {
    expect(parseCorrectionLines("All good, no issues.")).toEqual([]);
  });
});

describe("occurrenceId", () => {
  it("is stable for the same client, session and turn", () => {
    expect(occurrenceId("codex", "s1", "t1")).toBe(occurrenceId("codex", "s1", "t1"));
  });

  it("differs across turns and clients", () => {
    expect(occurrenceId("codex", "s1", "t1")).not.toBe(occurrenceId("codex", "s1", "t2"));
    expect(occurrenceId("codex", "s1", "t1")).not.toBe(occurrenceId("claude-code", "s1", "t1"));
  });
});
