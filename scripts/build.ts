import { join } from "node:path";
import { build } from "esbuild";
import { bundleOptions } from "./build-options.ts";
import { CODEX_ADAPTER_DIR, generateCodexAdapter } from "./codex-adapter.ts";
import { repoRoot } from "./paths.ts";

await build(bundleOptions);
await generateCodexAdapter(join(repoRoot, CODEX_ADAPTER_DIR));
