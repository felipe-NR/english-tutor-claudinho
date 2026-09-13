// Builds a throwaway marketplace for the Phase 1 spikes:
//
//   <out>/.claude-plugin/marketplace.json   Claude Code, strict: false, inline hooks and MCP
//   <out>/.agents/plugins/marketplace.json  Codex repo marketplace
//   <out>/plugin/                           Agent Plugins 1.0.0 probe package
//
// Usage: node spikes/build-probe-marketplace.ts <out-dir>

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { build } from "esbuild";
import { validatePluginPackage } from "../scripts/conformance/plugin-package.ts";
import { repoRoot } from "../scripts/paths.ts";

type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };

const PLUGIN = "english-tutor-probe";
const MARKETPLACE = "english-tutor-spike";

const outArgument = process.argv[2];
if (outArgument === undefined) {
  throw new Error("usage: node spikes/build-probe-marketplace.ts <out-dir>");
}
const out = resolve(outArgument);
const pluginDir = join(out, "plugin");

async function writeJson(path: string, value: Json): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function claudeHook(event: string): Json {
  return [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/dist/probe.mjs", "hook", "claude-code", event] }] }];
}

function codexHook(event: string): Json {
  return [{ hooks: [{ type: "command", command: `node "\${PLUGIN_ROOT}/dist/probe.mjs" hook codex ${event}`, timeout: 30 }] }];
}

await build({
  absWorkingDir: repoRoot,
  entryPoints: ["spikes/probe.ts"],
  outfile: join(pluginDir, "dist", "probe.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  logLevel: "warning",
});

await writeJson(join(pluginDir, "plugin.json"), {
  $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  name: PLUGIN,
  version: "0.0.1",
  description: "Phase 1 spike probe for english-tutor-claudinho. Records hook payloads and MCP handshakes.",
  extensions: { "com.openai": { hooks: "./com.openai/hooks/hooks.json" } },
});

await writeJson(join(pluginDir, "mcp.json"), {
  $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers: {
    [PLUGIN]: { type: "stdio", command: "node", args: ["${PLUGIN_ROOT}/dist/probe.mjs", "mcp", "agent-plugins-mcp-json"] },
  },
});

await writeJson(join(pluginDir, "com.openai", "hooks", "hooks.json"), {
  hooks: {
    SessionStart: codexHook("session-start"),
    UserPromptSubmit: codexHook("user-prompt-submit"),
    Stop: codexHook("stop"),
  },
});

await mkdir(join(pluginDir, "skills", PLUGIN), { recursive: true });
await writeFile(
  join(pluginDir, "skills", PLUGIN, "SKILL.md"),
  `---\nname: ${PLUGIN}\ndescription: Spike skill for english-tutor-claudinho. Use only when the user asks about the english-tutor probe.\n---\n\nReply that the english-tutor probe skill loaded.\n`,
);

await writeJson(join(out, ".claude-plugin", "marketplace.json"), {
  name: MARKETPLACE,
  owner: { name: "english-tutor-claudinho spikes" },
  plugins: [
    {
      name: PLUGIN,
      source: "./plugin",
      strict: false,
      skills: "./skills/",
      mcpServers: {
        [PLUGIN]: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/dist/probe.mjs", "mcp", "claude-marketplace-inline"] },
      },
      hooks: {
        SessionStart: claudeHook("session-start"),
        UserPromptSubmit: claudeHook("user-prompt-submit"),
        Stop: claudeHook("stop"),
      },
    },
  ],
});

await writeJson(join(out, ".agents", "plugins", "marketplace.json"), {
  name: MARKETPLACE,
  interface: { displayName: "english-tutor spikes" },
  plugins: [
    {
      name: PLUGIN,
      source: { source: "local", path: "./plugin" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    },
  ],
});

const findings = await validatePluginPackage(pluginDir);
console.log(`probe marketplace written to ${out}`);
console.log(findings.length === 0 ? "probe package conforms to Agent Plugins 1.0.0" : JSON.stringify(findings, null, 2));
