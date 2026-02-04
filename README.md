# OpenHeaders

A Chrome extension for modifying HTTP request and response headers. Built with Vue 3, TypeScript, Tailwind CSS 4, and shadcn-vue.

## Features

- Create profiles for sets of request/response header rules
- Add, edit, duplicate, delete, and reorder headers
- Enable/disable individual headers
- Multiple profiles with quick switching
- URL filters (include/exclude) to control where a profile applies
- Undo/redo history for changes
- Import/export profiles as JSON (including ModHeader imports)
- System/Light/Dark theme preference
- UI language preference (Auto / English / Swedish)

## Installation

### Development

1. Install dependencies:
```bash
bun install
```

2. Build the extension:
```bash
bun run build
```

3. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

### Development with hot reload

For development, you can run:
```bash
bun run dev
```

Then open `http://localhost:5173` in your browser to preview the popup UI.

## Usage

1. Click the extension icon in your browser toolbar.
2. Choose a profile in the sidebar (or add a new one).
3. Use the main tabs to switch between **Request**, **Response**, and **Filters**.
   - Each tab shows a small count of enabled items.
4. Add items using the **+** button in the sticky footer (or the **+** button in the profile header for headers).
5. For headers:
   - Edit name, value, and comment.
   - Toggle enabled/disabled with the checkbox.
   - Drag the grip icon to reorder.
   - Use the row menu to duplicate or delete.
6. For URL filters:
   - Choose include/exclude, match type, and pattern.
   - Drag the grip icon to reorder.
7. The footer **Clear** button removes all items in the active tab.
8. Use the profile menu (three dots) for:
   - Import/export profiles
   - Duplicate/delete profile
   - Theme preference
   - Language preference

## Tech Stack

- Vue 3 with Composition API
- TypeScript
- Tailwind CSS 4
- shadcn-vue components
- Pinia for state management
- Vite for building
- Vitest + Playwright for testing

## Project Structure

```
src/
├── App.vue                # Main application component
├── main.ts                # Application entry point
├── background/            # Chrome extension background service worker
├── components/            # Vue components
│   └── ui/                # shadcn-vue UI components
├── i18n/                  # Localization messages and helpers
├── lib/                   # Utility functions
├── stores/                # Pinia stores
├── types/                 # TypeScript type definitions
└── __tests__/             # Test files
```

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run tests in watch mode
- `bun run test:run` - Run tests once
