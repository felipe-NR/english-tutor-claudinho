import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { VERSION } from "../src/version.ts";
import { validatePluginPackage } from "./conformance/plugin-package.ts";
import { repoRoot } from "./paths.ts";

const PACKAGE_DIR = "plugin";
const versioned = z.looseObject({ version: z.string() });

async function readVersion(path: string): Promise<string> {
  const text = await readFile(join(repoRoot, path), "utf8");
  return versioned.parse(JSON.parse(text)).version;
}

const problems = (await validatePluginPackage(join(repoRoot, PACKAGE_DIR))).map(
  (finding) => `${PACKAGE_DIR}/${finding.path}: ${finding.message}`,
);

// The package carries its own LICENSE copy because a symlink to ../LICENSE
// would resolve outside the plugin root.
const [rootLicense, packageLicense] = await Promise.all([
  readFile(join(repoRoot, "LICENSE"), "utf8"),
  readFile(join(repoRoot, PACKAGE_DIR, "LICENSE"), "utf8"),
]);
if (rootLicense !== packageLicense) {
  problems.push(`${PACKAGE_DIR}/LICENSE: must be identical to the repository LICENSE`);
}

const versions = {
  "package.json": await readVersion("package.json"),
  [`${PACKAGE_DIR}/plugin.json`]: await readVersion(join(PACKAGE_DIR, "plugin.json")),
  "src/version.ts": VERSION,
};
if (new Set(Object.values(versions)).size !== 1) {
  problems.push(`version mismatch: ${JSON.stringify(versions)}`);
}

if (problems.length === 0) {
  console.log(`${PACKAGE_DIR}/ conforms to Agent Plugins 1.0.0 and the project layout rules.`);
} else {
  for (const problem of problems) {
    console.error(problem);
  }
  process.exitCode = 1;
}
