import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveReferencesDir } from "./paths.ts";

// The skill reference markdown is the single source of truth for the pedagogy.
// The MCP resources and the session-start hook both serve it from here, read at
// runtime from within the plugin package.
export async function readReference(name: "correction-protocol" | "l1-pt-br" | "practice-log-format"): Promise<string> {
  return readFile(join(resolveReferencesDir(), `${name}.md`), "utf8");
}
