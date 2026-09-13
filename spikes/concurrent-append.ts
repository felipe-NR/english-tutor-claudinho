// Spike S4: do concurrent appends from several processes keep JSONL lines
// intact? Each worker appends lines with appendFileSync (O_APPEND); the
// parent checks that every line parses and that no line is lost or repeated.
//
// Usage: node spikes/concurrent-append.ts

import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const WORKERS = 8;
const LINES_PER_WORKER = 2000;
const LINE_SIZES = [200, 8000];

const line = z.object({ worker: z.number(), seq: z.number(), pad: z.string() });

function runWorker(file: string, worker: number, lines: number, size: number): void {
  const pad = "x".repeat(size);
  for (let seq = 0; seq < lines; seq += 1) {
    appendFileSync(file, `${JSON.stringify({ worker, seq, pad })}\n`);
  }
}

function spawnWorker(file: string, worker: number, size: number): Promise<number | null> {
  const script = fileURLToPath(import.meta.url);
  const child = spawn(process.execPath, [script, "worker", file, String(worker), String(LINES_PER_WORKER), String(size)], {
    stdio: "inherit",
  });
  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve(code);
    });
  });
}

async function runExperiment(size: number): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "concurrent-append-"));
  const file = join(dir, "corrections.jsonl");
  try {
    const exitCodes = await Promise.all(Array.from({ length: WORKERS }, (_, worker) => spawnWorker(file, worker, size)));
    const rows = readFileSync(file, "utf8").split("\n").filter((row) => row !== "");
    const seen = new Set<string>();
    let corrupt = 0;
    for (const row of rows) {
      try {
        const parsed = line.safeParse(JSON.parse(row));
        if (parsed.success) {
          seen.add(`${String(parsed.data.worker)}:${String(parsed.data.seq)}`);
        } else {
          corrupt += 1;
        }
      } catch {
        corrupt += 1;
      }
    }
    const expected = WORKERS * LINES_PER_WORKER;
    console.log(
      JSON.stringify({ lineBytes: size, workers: WORKERS, expected, rows: rows.length, unique: seen.size, corrupt, exitCodes }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const [mode, file, worker, lines, size] = process.argv.slice(2);
if (mode === "worker" && file !== undefined) {
  runWorker(file, Number(worker), Number(lines), Number(size));
} else {
  for (const lineSize of LINE_SIZES) {
    await runExperiment(lineSize);
  }
}
