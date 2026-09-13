// src/version.ts
var VERSION = "0.0.0";

// src/cli.ts
var USAGE = `tutor ${VERSION}

Usage: tutor <command>

Commands:
  help      Show this message
  version   Print the version
`;
function run(argv) {
  const [command] = argv;
  switch (command) {
    case void 0:
    case "help":
    case "--help":
    case "-h":
      return { exitCode: 0, stdout: USAGE, stderr: "" };
    case "version":
    case "--version":
    case "-v":
      return { exitCode: 0, stdout: `${VERSION}
`, stderr: "" };
    default:
      return { exitCode: 2, stdout: "", stderr: `tutor: unknown command "${command}"

${USAGE}` };
  }
}

// src/main.ts
var result = run(process.argv.slice(2));
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
