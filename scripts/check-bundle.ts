import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { BUNDLE_PATH, bundleOptions } from "./build-options.ts";
import { repoRoot } from "./paths.ts";

// Installs from git run no build step, so the committed bundle must match
// what the current sources produce.
const result = await build({ ...bundleOptions, write: false });
const expected = result.outputFiles.map((file) => file.text).join("");
const committed = await readFile(join(repoRoot, BUNDLE_PATH), "utf8").catch(() => "");

if (committed === expected) {
  console.log(`${BUNDLE_PATH} matches the sources.`);
} else {
  console.error(`${BUNDLE_PATH} is stale. Run \`npm run build\` and commit the result.`);
  process.exitCode = 1;
}
