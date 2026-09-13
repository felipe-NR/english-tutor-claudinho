import { VERSION } from "./version.ts";

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

const USAGE = `tutor ${VERSION}

Usage: tutor <command>

Commands:
  mcp                       Run the MCP server over stdio
  hook <client> <event>     Trigger adapter for a client hook event
  report [--period P]       Print the practice log (P: day, week, all)
  config get [key]          Show preferences, or one preference
  config set <key> <value>  Change a preference
  purge --yes [--all|--from D --to D]
                            Erase records (D: YYYY-MM-DD)
  doctor                    Diagnose store, references and Node.js
  help                      Show this message
  version                   Print the version
`;

export function run(argv: readonly string[]): CliResult {
  const [command] = argv;
  switch (command) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      return { exitCode: 0, stdout: USAGE, stderr: "" };
    case "version":
    case "--version":
    case "-v":
      return { exitCode: 0, stdout: `${VERSION}\n`, stderr: "" };
    default:
      return { exitCode: 2, stdout: "", stderr: `tutor: unknown command "${command}"\n\n${USAGE}` };
  }
}
