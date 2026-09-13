# ADR-0001: The tutor lives in the portable core, and hooks only trigger it

- Status: accepted
- Date: 2026-09-13
- Decider: Felipe Neves Ricardo
- Full analysis: [implementation plan, section 3](../implementation-plan.md) (pt-BR)

## Context

The reference design ([Luna, 2026-02-04](https://blog.stackademic.com/turning-my-coding-tool-into-an-english-tutor-with-claude-code-hooks-de3384f09b7f)) corrects English through Claude Code hooks. `UserPromptSubmit` injects a correction instruction on every message, and `SessionStart` injects the whole practice log.

This project must follow [Agent Plugins 1.0.0](https://agent-plugins.org/specification) and install with each client's native plugin command. The spec standardizes two component types, Agent Skills and MCP servers. Its Design Decisions keep commands, hooks, agents, rules and LSP servers out of v1 because they "remain too client-specific for a stable portable contract". Client-specific manifest data goes under `extensions`, and client-specific files go in a top-level directory named for the client's reverse-domain namespace (§8).

The tutor needs five capabilities: a trigger on every user message, pedagogical content, deterministic recording of mistakes, retrieval (session briefing, reports, review) and native installation. Lifecycle hooks are the only mechanism that fires deterministically on every message, and hooks are the component type the spec leaves out.

Client support observed on 2026-09-13:

| Client | Loads Agent Plugins 1.0 | Per-message context injection |
|-|-|-|
| Claude Code 2.1.270 | no | yes, `UserPromptSubmit` |
| Codex CLI 0.153.4 | yes | yes, `UserPromptSubmit`; plugin hooks need a trust review |
| GitHub Copilot CLI 1.0.78 | yes | no, output of file-based `userPromptSubmitted` hooks is dropped |
| Antigravity CLI 1.1.27 | partially | yes, `PreInvocation` |

## Decision

Split the tutor into two layers.

1. **Portable core** in the Agent Plugins package `plugin/`: the `english-tutor` skill, the `english-tutor` MCP server and the bundled `tutor` CLI that the server runs. The correction protocol, the pt-BR profile, storage, briefing, reports and review live here.
2. **Trigger adapters**, one per client. Each one is declared in that client's namespace (`com.openai/hooks/hooks.json` for Codex) or in distribution metadata outside the package (the Claude Code marketplace entry). An adapter calls `tutor hook <client> <event>` and only translates that client's input and output formats.

Clients without per-message injection run in Standard mode: the user turns tutor mode on for the session, and the model records mistakes through an MCP tool. Skills-only clients run in Minimal mode, with on-demand corrections and no history.

`plugin/` stays fully conformant to the spec, and `npm run validate:plugin` enforces the layout.

## Consequences

- Any Agent Plugins client loads the core without client-specific code.
- Supporting a new client takes one adapter and one spike, with no change to the core.
- Claude Code, the main client, depends on a marketplace entry with `strict: false` until it implements Agent Plugins.
- Hook contracts change between client versions, so each adapter needs contract tests with recorded payloads.
- Per-message reinforcement exists only in clients that offer it.

## Revisit when

- Agent Plugins publishes a release after 1.0.0, especially one that adds hooks.
- Claude Code implements Agent Plugins.
