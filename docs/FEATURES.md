# OpenHeaders - Feature Documentation

A Chrome extension for modifying HTTP request and response headers, built with Vue 3, Pinia, Tailwind CSS 4, and shadcn-vue.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Types](#data-types)
3. [UI Composition & Flow](#ui-composition--flow)
4. [Profile Management](#profile-management)
5. [Header Management](#header-management)
6. [URL Filters](#url-filters)
7. [Undo/Redo System](#undoredo-system)
8. [Import/Export](#importexport)
9. [Theme & Language Preferences](#theme--language-preferences)
10. [Chrome Extension Integration](#chrome-extension-integration)
11. [Drag and Drop Reordering](#drag-and-drop-reordering)
12. [Persistence](#persistence)

---

## Architecture Overview

### Technology Stack
- **Frontend Framework**: Vue 3 with Composition API
- **State Management**: Pinia
- **UI Components**: shadcn-vue (Reka UI primitives)
- **Styling**: Tailwind CSS 4
- **Drag and Drop**: Swapy
- **Build Tool**: Vite
- **Testing**: Vitest + Playwright

### File Structure
```
src/
├── App.vue                 # Main application component
├── main.ts                 # Application entry point
├── background/
│   └── index.ts            # Chrome extension background script
├── i18n/
│   └── locales/            # Localization messages
├── stores/
│   └── headers.ts          # Pinia store for state management
├── types/
│   └── index.ts            # TypeScript type definitions
├── lib/
│   └── urlFilters.ts       # URL filter matching logic
├── components/
│   ├── ProfileSidebar.vue  # Profile selection sidebar
│   ├── ProfileHeader.vue   # Profile header with actions
│   ├── HeaderList.vue      # List of headers with drag/drop
│   ├── HeaderRow.vue       # Individual header row
│   ├── UrlFilterList.vue   # List of URL filters
│   └── UrlFilterRow.vue    # Individual URL filter row
└── __tests__/              # Test files
```

---

## Data Types

### HeaderRule
Represents a single HTTP header modification rule.

```typescript
interface HeaderRule {
  id: string                    // Unique identifier
  enabled: boolean              // Whether this header is active
  name: string                  // Header name (e.g., "Authorization")
  value: string                 // Header value
  comment: string               // Optional comment/note
  type: 'request' | 'response'  // Header type
  operation: 'set' | 'remove' | 'append' // How to modify the header
}
```

**Operations:**
- `set`: Replace or add the header with the specified value
- `remove`: Remove the header from requests/responses
- `append`: Append the value to an existing header

**UI note:** the current UI creates `set` operations and does not expose a UI control to change the operation. `remove` and `append` operations can still exist via imports.

### UrlFilter
Represents a URL pattern filter for selective header application.

```typescript
interface UrlFilter {
  id: string                    // Unique identifier
  enabled: boolean              // Whether this filter is active
  matchType: UrlFilterMatchType // How to match the URL
  pattern: string               // URL pattern to match
  type: 'include' | 'exclude'   // Include or exclude matching URLs
}
```

**Match types:**
- `host_equals`: Exact hostname match (e.g., `example.com`)
- `host_ends_with`: Hostname suffix match (e.g., `example.com` matches `api.example.com`)
- `url_starts_with`: Prefix match against URL string (e.g., `https://example.com/app`)
- `url_contains`: Substring match against URL string (e.g., `example.com/app`)
- `regex`: JavaScript `RegExp` matched against full URL
- `dnr_url_filter`: Glob-like match (`*` wildcard), matched against the full URL

### Profile
A collection of header rules and URL filters.

```typescript
interface Profile {
  id: string
  name: string
  color: string
  headers: HeaderRule[]
  urlFilters: UrlFilter[]
  createdAt: number
  updatedAt: number
}
```

### AppState
The complete application state.

```typescript
interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  darkModePreference: 'system' | 'light' | 'dark'
  languagePreference: 'auto' | 'en' | 'sv'
}
```

---

## UI Composition & Flow

### Main Layout
- **Profile Sidebar** (left): numbered profile buttons + add profile
- **Profile Header** (top): profile name, undo/redo, add header, export, and a “more” menu
- **Main Tabs**: Request, Response, Filters (with enabled item counts)
- **Content Area**: list of headers or filters
- **Sticky Footer**: Add and Clear actions for the active tab

### Tab Behavior
- **Request tab**: shows only request headers
- **Response tab**: shows only response headers
- **Filters tab**: shows URL filters
- **Counts** reflect enabled items in the active profile

---

## Profile Management

### Profile Sidebar (`ProfileSidebar.vue`)
- **Click** to select a profile
- **Drag and drop** to reorder profiles
- **Add button** creates a new profile

### Profile Actions
- **Create**: Adds “Profile N” with the next color in sequence
- **Rename**: Double‑click the profile name in the header
- **Duplicate**: More menu → “Duplicate profile”
- **Delete**: More menu → “Delete profile” + confirmation dialog
- **Always at least one profile**: deleting the last profile recreates a default

---

## Header Management

### Header List (`HeaderList.vue`)
- **Request/Response tabs** switch which headers are displayed and edited
- **Add** via footer “+” or header “+”
- **Clear** via footer “Clear” (clears only the current tab’s type)

### Header Row (`HeaderRow.vue`)
- Drag handle (grip icon)
- Enable/disable checkbox
- Name input
- Value input (disabled when `operation === 'remove'`)
- Comment input
- More menu (duplicate, delete)

**Non-UI capabilities:** the store also exposes `sortHeaders` for programmatic sorting, but there is no UI control wired to it at the moment.

---

## URL Filters

### UI
- Managed in the **Filters** tab
- Add a filter with the footer “+” button (creates an **include** filter by default)
- Each filter row allows:
  - Enable/disable
  - Include/exclude toggle
  - Match type selection
  - Pattern input
  - Drag and drop reordering

### Filter Behavior (Top‑Level Tab URL)
- Filters are evaluated against the **current tab URL** (top‑level site URL).
- **Exclude filters**: if any enabled exclude filter matches, the profile is disabled for that tab.
- **Include filters**:
  - If no enabled include filters exist, the profile applies to all tabs (except excluded ones).
  - Otherwise, the profile applies only when at least one include filter matches.

---

## Undo/Redo System

- Maximum history depth: **50** entries
- **Undo** and **Redo** buttons in the profile header
- History is saved on:
  - Profile add/remove/duplicate/update/reorder
  - Header add/remove/update/toggle/duplicate/clear/reorder
  - URL filter add/remove/update/clear/reorder
  - Import actions
- History is **not** saved on:
  - Profile selection (navigation only)
  - Theme or language preference changes

---

## Import/Export

### Export Profiles
- **Action**: Download button in the profile header
- **Filename**: `openheaders-profiles.json`
- **Format**:
```json
{
  "version": 1,
  "profiles": [...],
  "exportedAt": 1234567890
}
```

### Import Profiles
- **Action**: More menu → “Import profiles”
- Supports two formats:
  1. **OpenHeaders format** (object with `profiles` array)
  2. **ModHeader format** (array of ModHeader profiles)
- Imported items are appended, with **new IDs** generated to avoid conflicts.
- Large imports log a warning when profile counts exceed a threshold.

---

## Theme & Language Preferences

### Theme
- Stored as `darkModePreference`
- Options: **System**, **Light**, **Dark**
- Selected in the profile menu

### Language
- Stored as `languagePreference`
- Options: **Auto**, **English**, **Swedish**
- When set to **Auto**, the UI follows Chrome’s UI language

---

## Chrome Extension Integration

### Background Script (`background/index.ts`)
- Watches storage changes for the app state
- Builds **declarativeNetRequest session rules** for the active profile
- Uses `condition.tabIds` so rules apply only to matching tabs
- Tracks tab URLs with `chrome.tabs` events
- Clears any existing dynamic rules once on startup for safety

### Rule Building
- Enabled headers with non‑empty names are converted to Chrome `ModifyHeaderInfo`
- Request/response rules are built from header types
- If no headers or no matched tabs exist, the session rule is removed

---

## Drag and Drop Reordering

Implemented with **Swapy** in:
- Profile sidebar
- Header list
- URL filters list

Behavior:
- Visual feedback during drag
- Reordered IDs are persisted to the store
- Auto‑animate handles add/remove transitions

---

## Persistence

### Storage
- **Chrome extension**: `chrome.storage.local`
- **Development fallback**: `localStorage`
- **Key**: `openheaders_state`

### Saved State
```typescript
{
  profiles: Profile[],
  activeProfileId: string | null,
  darkModePreference: 'system' | 'light' | 'dark',
  languagePreference: 'auto' | 'en' | 'sv'
}
```

---

## Keyboard Shortcuts

### Profile Name Editing
- **Enter**: Confirm edit
- **Escape**: Cancel edit
