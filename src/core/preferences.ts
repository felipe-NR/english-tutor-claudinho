import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const CONFIG_FILE = "config.json";

// User preferences (plan §4.10). Defaults are applied on read, so a missing or
// partial config still yields a complete set.
export const Preferences = z.object({
  strictness: z.enum(["essential", "standard", "strict"]).default("standard"),
  explanation_language: z.enum(["en", "pt-BR", "en-with-pt-notes"]).default("en-with-pt-notes"),
  portuguese_messages: z.enum(["ignore", "hint"]).default("ignore"),
  placement: z.enum(["top", "bottom"]).default("top"),
  briefing: z.enum(["on", "off"]).default("on"),
  paused_until: z.iso.datetime().optional(),
  disabled_projects: z.array(z.string()).default([]),
});
export type Preferences = z.infer<typeof Preferences>;

// A partial update. An empty string for paused_until clears the pause.
export const PreferencesUpdate = Preferences.partial().extend({
  paused_until: z.union([z.iso.datetime(), z.literal("")]).optional(),
});
export type PreferencesUpdate = z.infer<typeof PreferencesUpdate>;

export function defaultPreferences(): Preferences {
  return Preferences.parse({});
}

export async function readPreferences(dir: string): Promise<Preferences> {
  const text = await readFile(join(dir, CONFIG_FILE), "utf8").catch(() => "");
  if (text.trim() === "") {
    return defaultPreferences();
  }
  const parsed = parseConfig(text);
  return parsed ?? defaultPreferences();
}

function parseConfig(text: string): Preferences | undefined {
  try {
    const result = Preferences.safeParse(JSON.parse(text));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export async function writePreferences(dir: string, prefs: Preferences): Promise<void> {
  await writeFile(join(dir, CONFIG_FILE), `${JSON.stringify(prefs, null, 2)}\n`, "utf8");
}

// Merge a validated patch into the stored preferences and persist the result.
export async function updatePreferences(dir: string, patch: PreferencesUpdate): Promise<Preferences> {
  const current = await readPreferences(dir);
  const next = mergePreferences(current, patch);
  await writePreferences(dir, next);
  return next;
}

function mergePreferences(current: Preferences, patch: PreferencesUpdate): Preferences {
  const merged: Preferences = {
    strictness: patch.strictness ?? current.strictness,
    explanation_language: patch.explanation_language ?? current.explanation_language,
    portuguese_messages: patch.portuguese_messages ?? current.portuguese_messages,
    placement: patch.placement ?? current.placement,
    briefing: patch.briefing ?? current.briefing,
    disabled_projects: patch.disabled_projects ?? current.disabled_projects,
  };
  const paused = resolvePause(current.paused_until, patch.paused_until);
  return paused === undefined ? merged : { ...merged, paused_until: paused };
}

function resolvePause(current: string | undefined, patch: string | undefined): string | undefined {
  if (patch === undefined) {
    return current;
  }
  return patch === "" ? undefined : patch;
}
