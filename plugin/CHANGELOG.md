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
