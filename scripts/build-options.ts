import type { BuildOptions } from "esbuild";
import { repoRoot } from "./paths.ts";

export const BUNDLE_PATH = "plugin/dist/tutor.mjs";

// The bundle runs on the oldest Node.js release the plugin supports, so the
// target stays at node22 even though development uses Node.js 24.
export const bundleOptions = {
  absWorkingDir: repoRoot,
  entryPoints: ["src/main.ts"],
  outfile: BUNDLE_PATH,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  legalComments: "eof",
  logLevel: "warning",
} satisfies BuildOptions;
