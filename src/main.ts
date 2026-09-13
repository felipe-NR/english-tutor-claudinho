import { run } from "./cli.ts";
import { dispatch } from "./commands.ts";

const argv = process.argv.slice(2);
const outcome = await dispatch(argv);
const result = outcome.handled ? outcome : run(argv);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
