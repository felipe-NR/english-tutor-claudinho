import type { ClientId, HookEvent } from "./types.ts";

// The portable hook runner returns context text. Codex 0.154 validates
// non-empty SessionStart and UserPromptSubmit stdout as event-specific JSON,
// so serialize that text only at the client boundary.
export function formatHookOutput(client: ClientId, event: HookEvent, context: string): string {
  if (client !== "codex" || context === "") {
    return context;
  }

  const hookEventName = codexContextEventName(event);
  if (hookEventName === undefined) {
    return context;
  }

  return `${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: context } })}\n`;
}

function codexContextEventName(event: HookEvent): "SessionStart" | "UserPromptSubmit" | undefined {
  switch (event) {
    case "session-start":
      return "SessionStart";
    case "user-prompt-submit":
      return "UserPromptSubmit";
    case "stop":
      return undefined;
  }
}
