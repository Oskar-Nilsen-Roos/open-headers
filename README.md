# OpenHeaders

A Chrome extension for modifying HTTP request and response headers. Built with Vue 3, TypeScript, Tailwind CSS 4, and shadcn-vue.

## Features

- Add, modify, and remove HTTP request headers
- Add, modify, and remove HTTP response headers
- Multiple profiles with quick switching
- Enable/disable individual headers or entire profiles
- Undo/redo functionality
- Import/export profiles as JSON
- Dark mode support
- Comments for headers
- Sort headers by name, value, or comment

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

1. Click the extension icon in your browser toolbar
2. Add headers using the "+ ADD" button
3. Enter the header name and value
4. Toggle headers on/off using the checkbox
5. Switch between profiles using the sidebar
6. Use the menu (three dots) for additional options like import/export

## Tech Stack

- Vue 3 with Composition API
- TypeScript
- Tailwind CSS 4
- shadcn-vue components
- Pinia for state management
- Vite for building
- Vitest for testing

## Project Structure

```
src/
├── background/       # Chrome extension background service worker
├── components/       # Vue components
│   └── ui/          # shadcn-vue UI components
├── stores/          # Pinia stores
├── types/           # TypeScript type definitions
├── lib/             # Utility functions
└── __tests__/       # Test files
```

## Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run tests
- `bun run test:run` - Run tests once

## License
Proprietary — All rights reserved. See `LICENSE`.
MIT
