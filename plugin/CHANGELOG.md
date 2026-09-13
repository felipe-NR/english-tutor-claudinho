# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Minimal Agent Plugins 1.0.0 manifest.
- `tutor` CLI skeleton with `help` and `version`.
- `english-tutor` Agent Skill with the correction protocol, the pt-BR mistake profile and the practice-log format.
- MCP server (`mcp.json`, `tutor mcp`) exposing the `record_corrections`, `get_briefing`, `get_report`, `set_preferences` and `purge_history` tools, the `english-tutor-on`, `english-review` and `english-report` prompts, and the `english-tutor://protocol`, `english-tutor://profile/pt-BR` and `english-tutor://report` resources.
- Portable core: append-only correction store with file locking and dedup, statistics, session briefing, Markdown report and preferences.
- `tutor report`, `tutor config`, `tutor purge` and `tutor doctor` commands.
- Trigger adapters for Claude Code and Codex (`tutor hook <client> <event>`): session-start protocol injection, once-per-turn reminder, and end-of-turn capture of the corrections from the assistant's final message.
- Kill switch (`ENGLISH_TUTOR_DISABLE=1`), pause (`paused_until`) and per-project disable that silence every hook. A hook never breaks a session: internal errors exit 0 with empty output and are logged locally.
- Claude Code hooks declared inline in the marketplace; the Codex legacy package with hooks generated into `adapters/codex/`.
