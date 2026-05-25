# Shared Agent Setup

This directory is the neutral, repo-owned source of truth for agent behavior in
Constell.

Use `.agents/` for configuration and guidance that should apply across tools.
Do not put durable shared guidance only in `.claude/`, `.codex/`, `.cursor/`,
or `.vscode/`.

## Layout

- `AGENTS.md`: canonical shared root instructions
- `ARCHITECTURE_PRINCIPLES.md`: architecture principles for high-scale
  observability
- `config.json`: shared bootstrap and MCP configuration used to generate
  tool-specific shims
- `skills/`: shared, tool-neutral implementation guidance for recurring
  workflows

## `config.json`

`.agents/config.json` contains shared configuration:

- `shared`: defaults used across tools
- `mcpServers`: project MCP servers and how to connect to them
- `claude`: Claude-specific generated settings inputs
- `codex`: Codex-specific generated settings inputs
- `cursor`: Cursor-specific generated settings inputs

Example shape:

```json
{
  "shared": {
    "setupScript": "bash scripts/setup.sh",
    "devCommand": "pnpm run dev",
    "devTerminalDescription": "Main development terminal running the development server"
  },
  "mcpServers": {
    "playwright": {
      "transport": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--isolated",
        "--save-session",
        "--output-dir",
        ".playwright-mcp",
        "--test-id-attribute",
        "data-testid"
      ]
    }
  }
}
```

## When To Edit `config.json`

Edit `.agents/config.json` when you need to:

- add, remove, or update a shared MCP server
- change the shared setup/bootstrap command
- change the default dev command or terminal label used by generated shims
- adjust generated Claude, Cursor, or Codex settings that are intentionally
  modeled in the shared config

Do not edit generated shim files by hand. Edit the canonical files in
`.agents/` instead.

## How To Extend `config.json`

### Add an MCP server

Add a new entry under `mcpServers`.

For `stdio` servers:

```json
{
  "mcpServers": {
    "example": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "some-package"]
    }
  }
}
```

For HTTP servers:

```json
{
  "mcpServers": {
    "example": {
      "transport": "http",
      "url": "https://example.com/mcp"
    }
  }
}
```

### Change bootstrap or default dev command

Update values in `shared`:

- `setupScript`
- `devCommand`
- `devTerminalDescription`

## Adding Shared Skills

Shared skills live under `.agents/skills/`.

Use them for durable, reusable guidance such as:

- backend implementation patterns
- provider-specific maintenance workflows
- repeated repo-specific review checklists

Do not use skills for one-off task notes or tool runtime configuration.

Keep skills concise with progressive disclosure and update
`.agents/skills/README.md` when adding new skills.
