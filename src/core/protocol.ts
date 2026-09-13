import { createHash } from "node:crypto";
import { CorrectionInput } from "./model.ts";

// The marker that opens every correction line. The end-of-turn capture looks for
// it, and the model is told to emit it, so it lives in one place.
export const CORRECTION_MARKER = "✏️";

// A compact operational protocol injected once per session by the hook. The full
// teaching version is the skill reference and the english-tutor://protocol
// resource; this is the short form that fits the session budget.
export const SESSION_PROTOCOL = [
  "[english-tutor] Act as my English tutor this session, alongside your normal work.",
  "Evaluate only the prose I write. Ignore code, commands, logs, stack traces, quotes, URLs, paths and pasted text.",
  `When my prose has errors, open your final reply with up to 3 lines, one per mistake: ${CORRECTION_MARKER} [category] "original" → "correction" (short reason).`,
  "Use the category IDs from english-tutor://profile/pt-BR. Explanations in English, with a short pt-BR note for false-friend and doubt-question.",
  "When my prose is correct, say nothing about English. Never put corrections into files, code, commit messages or PR descriptions.",
].join("\n");

// Derive the opaque per-turn occurrence id from the identifiers both the
// UserPromptSubmit and the Stop payloads carry, so the reminder, an MCP tool
// call and the end-of-turn capture all agree on it (plan §4.8).
export function occurrenceId(client: string, sessionId: string, turn: string): string {
  return createHash("sha256").update(`${client}\0${sessionId}\0${turn}`).digest("hex").slice(0, 16);
}

const LINE = new RegExp(
  `${CORRECTION_MARKER}\\s*\\[([a-z-]+)\\]\\s*"([^"]*)"\\s*(?:→|->)\\s*"([^"]*)"\\s*\\(([^)]*)\\)`,
  "u",
);

// Extract the corrections the model wrote in its final message. Lines that do
// not parse, or whose fragments break the store rules (unknown category, too
// long), are dropped rather than stored.
export function parseCorrectionLines(message: string): CorrectionInput[] {
  const corrections: CorrectionInput[] = [];
  for (const line of message.split("\n")) {
    const match = LINE.exec(line);
    if (match === null) {
      continue;
    }
    const parsed = CorrectionInput.safeParse({
      category: match[1],
      original: match[2],
      correction: match[3],
      reason: match[4],
    });
    if (parsed.success) {
      corrections.push(parsed.data);
    }
  }
  return corrections;
}
