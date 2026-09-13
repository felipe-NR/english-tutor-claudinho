import {
  type HookEvent,
  type HookInput,
  type JsonValue,
  SessionStartPayload,
  StopPayload,
  UserPromptPayload,
} from "./types.ts";

// Translate a Codex hook payload into the normalized shape. Codex identifies the
// turn with turn_id. Returns undefined for a payload that does not parse, so the
// runner emits the client's empty output.
export function parse(event: HookEvent, raw: JsonValue): HookInput | undefined {
  switch (event) {
    case "session-start": {
      const parsed = SessionStartPayload.safeParse(raw);
      if (!parsed.success) {
        return undefined;
      }
      const base = { event, sessionId: parsed.data.session_id, turn: parsed.data.session_id, cwd: parsed.data.cwd };
      return parsed.data.source === undefined ? base : { ...base, source: parsed.data.source };
    }
    case "user-prompt-submit": {
      const parsed = UserPromptPayload.safeParse(raw);
      if (!parsed.success) {
        return undefined;
      }
      const turn = parsed.data.turn_id ?? parsed.data.session_id;
      return { event, sessionId: parsed.data.session_id, turn, cwd: parsed.data.cwd, prompt: parsed.data.prompt };
    }
    case "stop": {
      const parsed = StopPayload.safeParse(raw);
      if (!parsed.success) {
        return undefined;
      }
      const turn = parsed.data.turn_id ?? parsed.data.session_id;
      const base = { event, sessionId: parsed.data.session_id, turn, cwd: parsed.data.cwd };
      return parsed.data.last_assistant_message === undefined
        ? base
        : { ...base, lastAssistantMessage: parsed.data.last_assistant_message };
    }
  }
}
