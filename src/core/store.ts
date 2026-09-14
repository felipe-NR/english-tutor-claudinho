import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { CorrectionInput, CorrectionRecord, CorrectionSource, mistakeKey } from "./model.ts";
import { isSafeStoredIdentifier } from "./privacy.ts";
import { renderReport } from "./report.ts";
import { computeStats } from "./stats.ts";

export const CORRECTIONS_FILE = "corrections.jsonl";
export const STATS_FILE = "stats.json";
export const PRACTICE_LOG_FILE = "english-practice-log.md";
const LOCK_DIR = ".lock";
const LOCK_TIMEOUT_MS = 3000;
const LOCK_RETRY_MS = 20;
const LOCK_STALE_MS = 10_000;

export interface RecordMeta {
  readonly client: string;
  readonly source: CorrectionSource;
  readonly ts?: string;
}

export interface RecordResult {
  readonly record: CorrectionRecord;
  // false when the same occurrence already held this mistake and the call was
  // merged instead of appended (plan §4.8).
  readonly recorded: boolean;
}

const RecordMetaInput = z.object({
  client: z.string().trim().min(1).max(64).refine(isSafeStoredIdentifier),
  source: CorrectionSource,
  ts: z.iso.datetime().optional(),
});

// Read every correction event. A malformed line is skipped rather than failing
// the whole read, so one bad append never hides the rest of the history.
export async function readCorrections(dir: string): Promise<CorrectionRecord[]> {
  const text = await readFile(join(dir, CORRECTIONS_FILE), "utf8").catch(() => "");
  const records: CorrectionRecord[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    const parsed = safeParseLine(line);
    if (parsed !== undefined) {
      records.push(parsed);
    }
  }
  return records;
}

function safeParseLine(line: string): CorrectionRecord | undefined {
  try {
    const result = CorrectionRecord.safeParse(JSON.parse(line));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

// Append one correction under a directory lock, deduplicating within the same
// occurrence. Returns the resulting record and whether it was newly stored.
export async function appendCorrection(
  dir: string,
  rawInput: CorrectionInput,
  meta: RecordMeta,
): Promise<RecordResult> {
  const input = CorrectionInput.parse(rawInput);
  const validatedMeta = RecordMetaInput.parse(meta);
  return withLock(dir, async () => {
    const existing = await readCorrections(dir);
    const key = mistakeKey(input.category, input.original, input.correction);

    if (input.occurrence_id !== undefined) {
      const duplicate = existing.find(
        (record) => record.occurrence_id === input.occurrence_id && record.mistake_key === key,
      );
      if (duplicate !== undefined) {
        return { record: duplicate, recorded: false };
      }
    }

    const record = CorrectionRecord.parse({
      id: randomUUID(),
      mistake_key: key,
      ts: validatedMeta.ts ?? new Date().toISOString(),
      client: validatedMeta.client,
      category: input.category,
      original: input.original,
      correction: input.correction,
      reason: input.reason,
      source: validatedMeta.source,
      ...(input.occurrence_id !== undefined ? { occurrence_id: input.occurrence_id } : {}),
    });

    await appendFile(join(dir, CORRECTIONS_FILE), `${JSON.stringify(record)}\n`, "utf8");
    await writeDerivatives(dir, [...existing, record]);
    return { record, recorded: true };
  });
}

// Regenerate the reconstructible derivatives (plan §4.9). They are best effort:
// a failure here must not lose the append that just succeeded.
async function writeDerivatives(dir: string, records: readonly CorrectionRecord[]): Promise<void> {
  try {
    await writeFile(join(dir, STATS_FILE), `${JSON.stringify(computeStats(records), null, 2)}\n`, "utf8");
    await writeFile(join(dir, PRACTICE_LOG_FILE), renderReport(records, "all"), "utf8");
  } catch {
    // A derivative can be rebuilt from corrections.jsonl on the next write.
  }
}

export interface PurgeRange {
  readonly from?: string;
  readonly to?: string;
}

// Remove records inside the date range (inclusive), or all of them when the
// range is empty. Returns how many records were removed.
export async function purgeCorrections(dir: string, range: PurgeRange): Promise<number> {
  return withLock(dir, async () => {
    const existing = await readCorrections(dir);
    const kept = existing.filter((record) => !inRange(record.ts, range));
    const removed = existing.length - kept.length;
    if (removed > 0) {
      const body = kept.map((record) => JSON.stringify(record)).join("\n");
      await writeFile(join(dir, CORRECTIONS_FILE), body === "" ? "" : `${body}\n`, "utf8");
      await writeDerivatives(dir, kept);
    }
    return removed;
  });
}

function inRange(ts: string, range: PurgeRange): boolean {
  if (range.from === undefined && range.to === undefined) {
    return true;
  }
  const day = ts.slice(0, 10);
  if (range.from !== undefined && day < range.from) {
    return false;
  }
  if (range.to !== undefined && day > range.to) {
    return false;
  }
  return true;
}

// A cross-process lock built on the atomic failure of mkdir when the directory
// already exists. A lock older than LOCK_STALE_MS is treated as abandoned.
async function withLock<T>(dir: string, action: () => Promise<T>): Promise<T> {
  await mkdir(dir, { recursive: true });
  const lockPath = join(dir, LOCK_DIR);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  for (;;) {
    const acquired = await mkdir(lockPath).then(
      () => true,
      () => false,
    );
    if (acquired) {
      break;
    }
    if (await lockIsStale(lockPath)) {
      await rm(lockPath, { recursive: true, force: true });
      continue;
    }
    if (Date.now() >= deadline) {
      throw new Error(`could not acquire the store lock at ${lockPath} within ${String(LOCK_TIMEOUT_MS)}ms`);
    }
    await delay(LOCK_RETRY_MS);
  }

  try {
    return await action();
  } finally {
    await rm(lockPath, { recursive: true, force: true });
  }
}

async function lockIsStale(lockPath: string): Promise<boolean> {
  const info = await stat(lockPath).catch(() => undefined);
  return info !== undefined && Date.now() - info.mtimeMs > LOCK_STALE_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
