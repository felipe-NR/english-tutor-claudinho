# english-tutor-claudinho

An [Agent Plugins 1.0.0](https://agent-plugins.org/specification) plugin that turns your coding agent into an English tutor. It corrects the English in the messages you send, records the mistakes you repeat and reviews them with you. It is tuned for Brazilian Portuguese speakers and builds on [Luna's Claude Code hooks setup](https://blog.stackademic.com/turning-my-coding-tool-into-an-english-tutor-with-claude-code-hooks-de3384f09b7f).

MVP clients: Claude Code and Codex.

## Install

Two commands per client. Both add this repository as a plugin marketplace, then install the plugin from it.

### Claude Code

```sh
claude plugin marketplace add felipe-NR/english-tutor-claudinho
claude plugin install english-tutor-claudinho@english-tutor-claudinho
```

The plugin brings the `english-tutor` skill, the MCP server and the hooks that trigger the tutor on every message. Node.js 22 or later must be on the PATH.

### Codex

```sh
codex plugin marketplace add felipe-NR/english-tutor-claudinho
codex plugin add english-tutor-claudinho@english-tutor-claudinho
```

Codex loads the skill and the MCP server from this package but ignores its hooks, so the message trigger ships as a legacy package under `adapters/codex/` that the same marketplace installs. Codex asks you to trust the plugin's hooks on install; approve it, or the tutor stays silent. In non-interactive `codex exec` runs, hooks are skipped unless you pass `--dangerously-bypass-hook-trust`. See [docs/compatibility.md](docs/compatibility.md) for the client behavior this relies on.

### Update

Installs stay pinned to the version they were fetched at; they do not auto-update. To move an existing install to the latest release, refresh the marketplace, then update the plugin. Your stored correction history and preferences live in the per-OS-user data store, outside the package, so an update leaves them untouched.

Claude Code (restart to apply):

```sh
claude plugin marketplace update english-tutor-claudinho
claude plugin update english-tutor-claudinho
```

Codex:

```sh
codex plugin marketplace update english-tutor-claudinho
codex plugin add english-tutor-claudinho@english-tutor-claudinho
```

## Status

Phases 0 (foundation), 1 (client verification), 2 (portable core), 3 (trigger adapters), 4 (packaging and distribution) and 5 (hardening) of the [implementation plan](docs/implementation-plan.md) (pt-BR) are complete. This is release `0.2.0`.

## Design

- `plugin/` is the portable Agent Plugins package: a skill, an MCP server and the bundled `tutor` CLI.
- Per-client hooks trigger the tutor on every message where the client supports it.

![Architecture of english-tutor-claudinho: the coding agent feeds hooks and the MCP server, which write each mistake to corrections.jsonl in the per-OS-user store, from which stats.json and the Markdown report are derived and the session briefing returns to the agent.](docs/diagrams/english-tutor-architecture-en.png)

[ADR-0001](docs/adr/0001-tutor-layers.md) explains the split. The diagram source is [`docs/diagrams/english-tutor-architecture-en.html`](docs/diagrams/english-tutor-architecture-en.html) (and `.svg`); a pt-BR version lives in the [implementation plan](docs/implementation-plan.md#4-arquitetura-proposta).

## Development

Development requires Node.js 24 (see `.nvmrc`). The bundled CLI runs on Node.js 22 or later.

```sh
npm ci
npm run check   # lint, typecheck, tests, plugin conformance, bundle freshness
npm run build   # rebuild plugin/dist/tutor.mjs and adapters/codex/ after changing src/
```

`plugin/dist/tutor.mjs` and the generated `adapters/codex/` are committed because installs from git run no build step, and CI checks both stay in sync with the sources. Rules for contributors and coding agents live in [AGENTS.md](AGENTS.md).

## Em português

O english-tutor-claudinho é um plugin que transforma o agente de código num tutor de inglês para brasileiros. Ele corrige o inglês das mensagens enviadas ao agente e acompanha os erros que se repetem. Instale com dois comandos por cliente (veja **Install** acima): no Claude Code, `claude plugin marketplace add felipe-NR/english-tutor-claudinho` e depois `claude plugin install english-tutor-claudinho@english-tutor-claudinho`; no Codex, os mesmos passos com `codex`. Esta é a versão `0.2.0`. O [plano de implementação](docs/implementation-plan.md) está em português.

## License

[MIT](LICENSE)
