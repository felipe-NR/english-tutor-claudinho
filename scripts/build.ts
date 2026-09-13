import { build } from "esbuild";
import { bundleOptions } from "./build-options.ts";

await build(bundleOptions);
