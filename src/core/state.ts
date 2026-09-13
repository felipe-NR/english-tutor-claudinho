import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const STATE_DIR = "state";
const MARKER_TTL_MS = 60 * 60 * 1000;

// Claim a one-time marker. Returns true the first time a key is seen and false
// afterwards, so a turn that fires two hook declarations emits the reminder
// once (plan §4.3). The exclusive-create write makes the claim atomic.
export async function claimOnce(dir: string, key: string): Promise<boolean> {
  const stateDir = join(dir, STATE_DIR);
  await mkdir(stateDir, { recursive: true });
  await sweep(stateDir);
  try {
    await writeFile(join(stateDir, `${key}.marker`), String(Date.now()), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

// Drop markers past their TTL so the state directory does not grow without
// bound. Best effort: a failure here never blocks a claim.
async function sweep(stateDir: string): Promise<void> {
  const entries = await readdir(stateDir).catch(() => []);
  const cutoff = Date.now() - MARKER_TTL_MS;
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(stateDir, entry);
      const info = await stat(path).catch(() => undefined);
      if (info !== undefined && info.mtimeMs < cutoff) {
        await rm(path, { force: true }).catch(() => undefined);
      }
    }),
  );
}
