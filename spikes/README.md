# Phase 1 spikes

Throwaway tooling that answers the verification questions in the [implementation plan](../docs/implementation-plan.md) (Fase 1). Results live in [docs/compatibility.md](../docs/compatibility.md). Nothing here ships in `plugin/`.

| File | Purpose |
|-|-|
| `probe.ts` | Hook recorder and minimal MCP server. Logs payloads, environment variables and store writes to `$TMPDIR/english-tutor-spike/events.jsonl`, and injects marker instructions to show which context reaches the model. |
| `build-probe-marketplace.ts` | Builds a temporary marketplace with the probe as an Agent Plugins package, a Claude Code marketplace entry (`strict: false`, inline hooks and MCP) and a Codex repo marketplace. |
| `concurrent-append.ts` | Checks that concurrent JSONL appends from several processes keep every line intact. |
| `spike-paths.ts` | Log and store locations shared by the probe. |

Run clients against the probe only in isolated profiles (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`), so the real `~/.claude` and `~/.codex` stay untouched. Re-run the spikes when a client release changes hooks, plugins or MCP handling, and update the compatibility matrix and fixtures.
