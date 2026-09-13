import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { CODEX_ADAPTER_DIR, generateCodexAdapter } from "./codex-adapter.ts";
import { repoRoot } from "./paths.ts";

// Installs from git run no build step, so the committed Codex adapter must match
// what the current plugin/ produces.
async function readTree(root: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        files.set(relative(root, path).split(sep).join("/"), await readFile(path));
      }
    }
  }
  await walk(root);
  return files;
}

function diff(committed: ReadonlyMap<string, Buffer>, expected: ReadonlyMap<string, Buffer>): string[] {
  const problems: string[] = [];
  for (const [path, content] of expected) {
    const current = committed.get(path);
    if (current === undefined) {
      problems.push(`missing: ${path}`);
    } else if (!current.equals(content)) {
      problems.push(`stale: ${path}`);
    }
  }
  for (const path of committed.keys()) {
    if (!expected.has(path)) {
      problems.push(`unexpected: ${path}`);
    }
  }
  return problems.sort((a, b) => a.localeCompare(b));
}

const committedDir = join(repoRoot, CODEX_ADAPTER_DIR);
const temp = await mkdtemp(join(tmpdir(), "codex-adapter-"));
try {
  await generateCodexAdapter(temp);
  const problems = diff(await readTree(committedDir).catch(() => new Map<string, Buffer>()), await readTree(temp));
  if (problems.length === 0) {
    console.log(`${CODEX_ADAPTER_DIR} matches plugin/.`);
  } else {
    console.error(`${CODEX_ADAPTER_DIR} is out of date. Run \`npm run build\` and commit the result.`);
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    process.exitCode = 1;
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
