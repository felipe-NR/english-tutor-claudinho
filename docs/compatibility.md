# Client compatibility

Verified on 2026-09-13 with the Phase 1 spikes, on Linux 7.0 and Node.js 24.14.1. Every client ran in an isolated profile (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`). The probe package, the marketplace builder and the concurrency experiment live in [`spikes/`](../spikes/), and the recorded payloads live in [`test/contract/fixtures/`](../test/contract/fixtures/).

## Summary

| Question | Claude Code 2.1.270 | Codex CLI 0.153.4 |
|-|-|-|
| Installs the canonical Agent Plugins package | yes, from `.claude-plugin/marketplace.json` with `strict: false` | yes, from `.agents/plugins/marketplace.json` |
| Root Agent Plugins `plugin.json` conflicts with the client format | no | no |
| Skills from `skills/` | yes | yes, shown to the model as `plugin:skill` |
| MCP server source | marketplace entry; `mcp.json` is ignored | `mcp.json`, with `${PLUGIN_ROOT}` expanded |
| MCP `instructions` reach the model | yes | no |
| Hooks from the canonical package | yes, declared inline in the marketplace entry | **no**: hooks are never loaded for Agent Plugins packages |
| Hooks from a legacy `.codex-plugin/plugin.json` package | not applicable | yes, from `hooks/hooks.json` |
| `SessionStart` and `UserPromptSubmit` stdout reaches the model | yes | yes, as developer messages |
| `Stop` payload carries `last_assistant_message` | yes | yes |
| Hook trust | no extra step after install | required; `codex exec` skips untrusted hooks without a warning |
| Hooks and MCP servers write the per-user store | yes, also with the sandbox enabled | yes, also with `-s read-only` |
| Mode with the canonical package | **Completo** | **Padrão** |
| Mode with the generated legacy package (decision D12) | not applicable | **Completo** |

## S1: Claude Code

- `claude plugin marketplace add <dir>` and `claude plugin install english-tutor-probe@english-tutor-spike --scope user -y` installed the probe from `./plugin`. `claude plugin details` listed 1 skill, 3 hooks (`SessionStart`, `UserPromptSubmit`, `Stop`) and 1 MCP server.
- The root `plugin.json` in Agent Plugins format caused no conflict with `strict: false`.
- The MCP server started from the marketplace entry. Claude Code does not read the Agent Plugins `mcp.json`.
- A `claude -p` run echoed the markers from `SessionStart`, `UserPromptSubmit` and the MCP `instructions`, so all three reach the model.
- `SessionStart` and `UserPromptSubmit` hooks fire before authentication. They ran in a profile that was not logged in, so the adapter must stay cheap and side-effect free.
- For a marketplace added from a local directory, `CLAUDE_PLUGIN_ROOT` points at the source directory, not at the copy under `plugins/cache/`.

## S2: Codex

- `codex plugin marketplace add <dir>` read `.agents/plugins/marketplace.json` and ignored `.claude-plugin/marketplace.json` in the same directory. `codex plugin add english-tutor-probe@english-tutor-spike` copied the package to `plugins/cache/<marketplace>/<plugin>/<version>/`.
- Hooks declared for the Agent Plugins package never ran, with or without `--dangerously-bypass-hook-trust`. Five declarations failed the same way: `extensions.com.openai.hooks` as a path to `./com.openai/hooks/hooks.json`, as a path to `./hooks/hooks.json`, as an array of paths, as an inline object, and the default `hooks/hooks.json` with no extension field.
- The Codex source explains it. [`loader.rs`](https://github.com/openai/codex/blob/dfaf451426868c22e6859f5494150fd6338c3257/codex-rs/core-plugins/src/loader.rs#L954-L963) returns no hook sources when the manifest format is `AgentPlugin`, and [`manifest.rs`](https://github.com/openai/codex/blob/dfaf451426868c22e6859f5494150fd6338c3257/codex-rs/core-plugins/src/manifest.rs#L168) marks every package with a root `plugin.json` as `AgentPlugin`. The [OpenAI plugin documentation](https://developers.openai.com/plugins) describes `extensions.com.openai.hooks` for Agent Plugins packages, so the documentation and the implementation disagree.
- A package with only `.codex-plugin/plugin.json` and `hooks/hooks.json` loaded its hooks. They received `PLUGIN_ROOT`, `PLUGIN_DATA`, `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`.
- User hooks in `$CODEX_HOME/hooks.json` and legacy plugin hooks both ran only with `--dangerously-bypass-hook-trust`. Without the flag, `codex exec` skipped them and printed nothing.
- The session transcript showed the stdout of `SessionStart` and `UserPromptSubmit` as developer messages. Two hook sources with the same output produced two developer messages, which confirms the need for per-turn deduplication.
- `codex exec` waits for stdin to close when stdin is not a terminal ("Reading additional input from stdin..."). Automation has to redirect stdin from `/dev/null`.

## S3: MCP `instructions`

| Client | `clientInfo` | Protocol version | `instructions` in the model context |
|-|-|-|-|
| Claude Code | `{"name":"claude-code","title":"Claude Code","version":"2.1.270"}` | `2025-11-25` | yes |
| Codex | `{"name":"codex-mcp-client","title":"Codex","version":"0.153.4"}` | `2025-06-18` | no: absent from `codex debug prompt-input` and from the session transcript |

## S4: Store

- Hooks and MCP servers of both clients created and wrote files in a directory under the OS user's home and in the client's plugin data directory. That held with the Claude Code sandbox enabled (`{"sandbox":{"enabled":true}}`) and with Codex `-s read-only`; both sandboxes govern the model's shell commands, not hooks or MCP servers.
- Plugin data directories: Claude Code uses `<config>/plugins/data/<plugin>-<marketplace>`; Codex uses `<CODEX_HOME>/plugins/data/agent-plugins/<sha256>` for Agent Plugins packages and `<CODEX_HOME>/plugins/data/<plugin>-<marketplace>` for legacy packages.
- `spikes/concurrent-append.ts` ran 8 processes appending 2,000 lines each with `appendFileSync`. With 200-byte and 8,000-byte lines, on tmpfs (3 runs) and ext4 (1 run), every one of the 16,000 lines parsed and none was lost or repeated. Windows was not tested, so the store keeps the planned file lock.

## Environment variables

| Variable | Claude Code hooks and MCP | Codex MCP (Agent Plugins package) | Codex hooks (legacy package) |
|-|-|-|-|
| `PLUGIN_ROOT` | no | yes | yes |
| `PLUGIN_DATA` | no | yes | yes |
| `CLAUDE_PLUGIN_ROOT` | yes | no | yes |
| `CLAUDE_PLUGIN_DATA` | yes | no | yes |
| `CLAUDE_PROJECT_DIR` | yes | no | no |

## Hook payload fields

| Event | Claude Code | Codex |
|-|-|-|
| `SessionStart` | `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `source` | adds `model`, `permission_mode` |
| `UserPromptSubmit` | `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode`, `hook_event_name`, `prompt` | `session_id`, `turn_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `permission_mode`, `prompt` |
| `Stop` | adds `effort`, `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons` | adds `turn_id`, `model`, `stop_hook_active`, `last_assistant_message` |

## Reproduce

```sh
node spikes/build-probe-marketplace.ts /tmp/probe-marketplace
CLAUDE_CONFIG_DIR=/tmp/claude-profile claude plugin marketplace add /tmp/probe-marketplace
CLAUDE_CONFIG_DIR=/tmp/claude-profile claude plugin install english-tutor-probe@english-tutor-spike -y
CODEX_HOME=/tmp/codex-profile codex plugin marketplace add /tmp/probe-marketplace
CODEX_HOME=/tmp/codex-profile codex plugin add english-tutor-probe@english-tutor-spike
node spikes/concurrent-append.ts
```

The probe appends every event to `$TMPDIR/english-tutor-spike/events.jsonl` and tests writes to `~/.english-tutor-claudinho-spike`. Both profiles need a login before `claude -p` or `codex exec` runs.
