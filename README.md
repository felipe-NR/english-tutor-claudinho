# english-tutor-claudinho

An [Agent Plugins 1.0.0](https://agent-plugins.org/specification) plugin that turns your coding agent into an English tutor. It corrects the English in the messages you send, records the mistakes you repeat and reviews them with you. It is tuned for Brazilian Portuguese speakers and builds on [Luna's Claude Code hooks setup](https://blog.stackademic.com/turning-my-coding-tool-into-an-english-tutor-with-claude-code-hooks-de3384f09b7f).

## Status

Phases 0 (foundation), 1 (client verification) and 2 (portable core) of the [implementation plan](docs/implementation-plan.md) (pt-BR) are complete. The MCP server, the `english-tutor` skill and the local store work; the per-message trigger (hooks) and installation instructions arrive with the next phases.

MVP clients: Claude Code and Codex.

## Design

- `plugin/` is the portable Agent Plugins package: a skill, an MCP server and the bundled `tutor` CLI.
- Per-client hooks trigger the tutor on every message where the client supports it.

[ADR-0001](docs/adr/0001-tutor-layers.md) explains the split.

## Development

Development requires Node.js 24 (see `.nvmrc`). The bundled CLI runs on Node.js 22 or later.

```sh
npm ci
npm run check   # lint, typecheck, tests, plugin conformance, bundle freshness
npm run build   # rebuild plugin/dist/tutor.mjs after changing src/
```

`plugin/dist/tutor.mjs` is committed because installs from git run no build step. Rules for contributors and coding agents live in [AGENTS.md](AGENTS.md).

## Em português

O english-tutor-claudinho é um plugin que transforma o agente de código num tutor de inglês para brasileiros. Ele corrige o inglês das mensagens enviadas ao agente e acompanha os erros que se repetem. As Fases 0, 1 e 2 foram concluídas: o servidor MCP, a skill e o histórico local já funcionam; o gatilho por mensagem e a instalação vêm nas próximas fases. O [plano de implementação](docs/implementation-plan.md) está em português.

## License

[MIT](LICENSE)
