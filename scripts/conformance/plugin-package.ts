import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { z } from "zod";
import mcpSchema from "../../vendor/agent-plugins/1.0.0/mcp.schema.json" with { type: "json" };
import pluginSchema from "../../vendor/agent-plugins/1.0.0/plugin.schema.json" with { type: "json" };

export interface Finding {
  readonly path: string;
  readonly message: string;
}

type Report = (path: string, message: string) => void;

type PackageFile =
  | { readonly kind: "missing" }
  | { readonly kind: "not-a-file" }
  | { readonly kind: "file"; readonly text: string };

// Portable entries this project allows at the plugin root. Everything else is
// either a reverse-domain namespace directory or a layout violation (decision D3).
const PORTABLE_FILES = new Set(["plugin.json", "mcp.json", "LICENSE", "CHANGELOG.md", "README.md"]);
const PORTABLE_DIRECTORIES = new Set(["skills", "dist", "assets"]);
const NAMESPACE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const mcpServersConfig = z.object({
  mcpServers: z.record(z.string(), z.looseObject({ type: z.string().optional(), command: z.string().optional() })).optional(),
});

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifest = ajv.compile(pluginSchema);
const validateMcpConfig = ajv.compile(mcpSchema);

const jsonValue = z.json();
const manifestExtensions = z.looseObject({
  extensions: z.record(z.string(), z.json()).optional(),
});

type JsonValue = z.infer<typeof jsonValue>;

export async function validatePluginPackage(root: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const report: Report = (path, message) => {
    findings.push({ path, message });
  };

  const realRoot = await realpath(root);
  await checkContainment(realRoot, realRoot, report);
  await checkLayout(realRoot, report);
  await checkManifest(realRoot, report);
  await checkMcpConfig(realRoot, report);
  await checkSkills(realRoot, report);

  return findings.sort((a, b) => a.path.localeCompare(b.path) || a.message.localeCompare(b.message));
}

async function checkManifest(root: string, report: Report): Promise<void> {
  const file = await readPackageFile(root, "plugin.json");
  if (file.kind === "missing") {
    report("plugin.json", "is missing; every plugin needs a manifest at its root (spec §4.1)");
    return;
  }
  if (file.kind === "not-a-file") {
    report("plugin.json", "must be a regular file (spec §4.1)");
    return;
  }

  const manifest = parseJson("plugin.json", file.text, report);
  if (manifest === undefined) {
    return;
  }
  if (!validateManifest(manifest)) {
    reportSchemaErrors("plugin.json", validateManifest.errors, report);
  }

  const parsed = manifestExtensions.safeParse(manifest);
  if (parsed.success && parsed.data.extensions !== undefined) {
    for (const key of Object.keys(parsed.data.extensions)) {
      if (!NAMESPACE.test(key)) {
        report("plugin.json", `/extensions/${key} is not a reverse-domain namespace (spec §8.1)`);
      }
    }
  }
}

async function checkMcpConfig(root: string, report: Report): Promise<void> {
  const file = await readPackageFile(root, "mcp.json");
  if (file.kind === "not-a-file") {
    report("mcp.json", "must be a regular file (spec §6.2)");
  }
  if (file.kind !== "file") {
    return;
  }

  const config = parseJson("mcp.json", file.text, report);
  if (config === undefined) {
    return;
  }
  if (!validateMcpConfig(config)) {
    reportSchemaErrors("mcp.json", validateMcpConfig.errors, report);
    return;
  }

  // The schema constrains env keys and the cwd shape, but leaves `command` a
  // free string. The spec (§6.2) resolves it as one executable token, so an
  // embedded argument or path separator would not run as written.
  const parsed = mcpServersConfig.safeParse(config);
  if (!parsed.success || parsed.data.mcpServers === undefined) {
    return;
  }
  for (const [name, server] of Object.entries(parsed.data.mcpServers)) {
    if (server.type === "stdio" && server.command !== undefined && /\s/.test(server.command)) {
      report("mcp.json", `/mcpServers/${name}/command must be a single executable token, not "${server.command}" (spec §6.2)`);
    }
  }
}

// Agent Skills live under skills/<name>/SKILL.md with YAML frontmatter that
// declares a kebab-case name matching the directory and a description.
async function checkSkills(root: string, report: Report): Promise<void> {
  const skillsDir = join(root, "skills");
  const info = await stat(skillsDir).catch(() => undefined);
  if (info === undefined) {
    return;
  }
  if (!info.isDirectory()) {
    report("skills", "must be a directory (spec §6.2)");
    return;
  }

  for (const entry of await readdir(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    await checkSkill(skillsDir, entry.name, report);
  }
}

async function checkSkill(skillsDir: string, name: string, report: Report): Promise<void> {
  const where = `skills/${name}`;
  const skillFile = join(skillsDir, name, "SKILL.md");
  const info = await stat(skillFile).catch(() => undefined);
  if (info?.isFile() !== true) {
    report(where, "is missing SKILL.md (Agent Skills §2)");
    return;
  }

  const text = await readFile(skillFile, "utf8");
  const meta = frontmatter(text);
  if (meta === undefined) {
    report(`${where}/SKILL.md`, "has no YAML frontmatter (Agent Skills §2)");
    return;
  }
  if (meta.name === undefined || meta.name === "") {
    report(`${where}/SKILL.md`, "frontmatter is missing `name` (Agent Skills §2)");
  } else if (!SKILL_NAME.test(meta.name)) {
    report(`${where}/SKILL.md`, `frontmatter name "${meta.name}" is not lowercase kebab-case (Agent Skills §2)`);
  } else if (meta.name !== name) {
    report(`${where}/SKILL.md`, `frontmatter name "${meta.name}" does not match the directory "${name}" (Agent Skills §2)`);
  }
  if (meta.description === undefined || meta.description === "") {
    report(`${where}/SKILL.md`, "frontmatter is missing `description` (Agent Skills §2)");
  }
}

interface SkillMeta {
  readonly name: string | undefined;
  readonly description: string | undefined;
}

function frontmatter(text: string): SkillMeta | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (match === null) {
    return undefined;
  }
  const block = match[1] ?? "";
  return { name: scalar(block, "name"), description: scalar(block, "description") };
}

function scalar(block: string, key: string): string | undefined {
  const line = new RegExp(`^${key}:[ \\t]*(.+)$`, "m").exec(block);
  if (line === null) {
    return undefined;
  }
  const value = (line[1] ?? "").trim();
  return value.replace(/^["']/, "").replace(/["']$/, "").trim();
}

async function checkLayout(root: string, report: Report): Promise<void> {
  for (const entry of await readdir(root)) {
    const info = await stat(join(root, entry)).catch(() => undefined);
    if (info?.isDirectory() === true && (PORTABLE_DIRECTORIES.has(entry) || NAMESPACE.test(entry))) {
      continue;
    }
    if (info?.isFile() === true && PORTABLE_FILES.has(entry)) {
      continue;
    }
    report(
      entry,
      "is outside the portable layout; client-specific files belong in a reverse-domain namespace directory (spec §8.2) and distribution files belong outside the package",
    );
  }
}

async function checkContainment(root: string, directory: string, report: Report): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = relative(root, path);
    const target = await realpath(path).catch(() => undefined);
    if (target === undefined) {
      report(name, "cannot be resolved; check for a broken symlink");
      continue;
    }
    const fromRoot = relative(root, target);
    if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
      report(name, "resolves outside the plugin root (spec §4.1)");
      continue;
    }
    if (entry.isDirectory()) {
      await checkContainment(root, path, report);
    }
  }
}

async function readPackageFile(root: string, name: string): Promise<PackageFile> {
  const path = join(root, name);
  const info = await stat(path).catch(() => undefined);
  if (info === undefined) {
    return { kind: "missing" };
  }
  if (!info.isFile()) {
    return { kind: "not-a-file" };
  }
  return { kind: "file", text: await readFile(path, "utf8") };
}

function parseJson(name: string, text: string, report: Report): JsonValue | undefined {
  try {
    const result = jsonValue.safeParse(JSON.parse(text));
    if (result.success) {
      return result.data;
    }
    report(name, "does not contain a JSON value");
  } catch (error) {
    report(name, error instanceof SyntaxError ? `is not valid JSON: ${error.message}` : "is not valid JSON");
  }
  return undefined;
}

function reportSchemaErrors(name: string, errors: readonly ErrorObject[] | null | undefined, report: Report): void {
  for (const error of errors ?? []) {
    const location = error.instancePath === "" ? "(root)" : error.instancePath;
    report(name, `${location} ${error.message ?? "is invalid"} ${JSON.stringify(error.params)}`);
  }
}
