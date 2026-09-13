import { VERSION } from "./version.ts";

export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

const USAGE = `tutor ${VERSION}

Usage: tutor <command>

Commands:
  help      Show this message
  version   Print the version
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
