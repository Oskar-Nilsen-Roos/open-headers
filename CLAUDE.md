# OpenHeaders

A Chrome extension for modifying HTTP request and response headers, built with Vue 3, TypeScript, Tailwind CSS 4, and shadcn-vue.

## Package Manager

This project uses bun.

## Commands

```bash
bun run dev      # Dev server at localhost:5173
bun run build    # Build to dist/
bun run test     # Run tests
```

## Domain Concepts

- Uses Chrome's declarativeNetRequest API (not webRequest)
- Headers have: name, value, comment, enabled, type (request/response), operation (set/remove/append)
- Profiles group headers and URL filters together
- Dark mode supports system/light/dark preferences
- Profile colors are customizable

## Gotchas

- Use `text-white` (not `text-primary-foreground`) on colored backgrounds — the latter is dark in dark mode, causing contrast issues on backgrounds that are the same in both themes.

## Documentation

For detailed guides, see `docs/`:
- [Features & architecture](docs/FEATURES.md) — data types, UI composition, Chrome integration
- [Store API](docs/STORE_API.md) — Pinia store methods and state
- [Testing](docs/TESTING.md) — test structure, categories, commands
- [Releasing](docs/RELEASING.md) — version bumps, tagging, CI workflow
- [Conventions](docs/CONVENTIONS.md) — commit messages, terminology

## Claude Code

### Plugins
- `typescript-lsp` — type checking
- `playwright` — browser testing
- `context7` — documentation lookup

### Skills
- `/repomix-explorer` — pack codebase for context export
