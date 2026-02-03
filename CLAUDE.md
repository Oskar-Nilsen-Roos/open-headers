# OpenHeaders - Project Context

## Overview
A Chrome extension for modifying HTTP request and response headers. Built with Vue 3, TypeScript, Tailwind CSS 4, and shadcn-vue.

**Project Name:** OpenHeaders
**Package Name:** openheaders
**Storage Key:** openheaders_state
**Export Filename:** openheaders-profiles.json

## Tech Stack
- Vue 3 with Composition API
- TypeScript
- Tailwind CSS 4
- shadcn-vue components (reka-ui based)
- Pinia for state management
- Vite for building
- Vitest for testing

## Project Structure
```
src/
├── background/       # Chrome extension service worker
├── components/       # Vue components
│   └── ui/          # shadcn-vue UI components
├── stores/          # Pinia stores (headers.ts is main store)
├── types/           # TypeScript types
├── lib/             # Utilities
└── __tests__/       # Tests (unit, integration, browser, e2e)
```

## Key Files
- `src/stores/headers.ts` - Main state management (profiles, headers, undo/redo)
- `src/background/index.ts` - Chrome declarativeNetRequest rules
- `src/components/ProfileHeader.vue` - Header bar with actions
- `src/components/HeaderList.vue` - Header rows display
- `src/components/ProfileSidebar.vue` - Profile switching
- `public/manifest.json` - Chrome extension manifest v3

## Commands
```bash
npm run dev      # Dev server at localhost:5173
npm run build    # Build to dist/
npm run test     # Run tests
```

## TODO
- [ ] Import ModHeader JSON profiles (convert format to OpenHeaders)

## Claude Code Setup

### Recommended Plugins
Contributors using Claude Code should enable these plugins for the best experience:
- `typescript-lsp` - TypeScript language server for type checking
- `playwright` - Browser testing and interaction
- `context7` - Up-to-date documentation lookup

Optional:
- `frontend-design` - UI/UX design assistance

### Available Skills
Project-specific skills in `.claude/skills/`:
- `/repomix-explorer` - Pack codebase for context export

## Notes
- Uses declarativeNetRequest API (not webRequest)
- Dark mode preference: system/light/dark
- Profile colors are customizable
- Headers have: name, value, comment, enabled, type (request/response), operation (set/remove/append)

## Gotchas
- ProfileHeader uses `text-white` not `text-primary-foreground` - the latter is dark in dark theme causing contrast issues. This goes for any contrasting background color that's the same in both light and dark mode.
