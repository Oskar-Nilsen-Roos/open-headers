# OpenHeaders - Feature Documentation

A Chrome extension for modifying HTTP request and response headers, built with Vue 3, Pinia, Tailwind CSS 4, and shadcn-vue.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Types](#data-types)
3. [Profile Management](#profile-management)
4. [Header Management](#header-management)
5. [URL Filters](#url-filters)
6. [Drag and Drop Reordering](#drag-and-drop-reordering)
7. [Undo/Redo System](#undoredo-system)
8. [Import/Export](#importexport)
9. [Dark Mode](#dark-mode)
10. [Chrome Extension Integration](#chrome-extension-integration)
11. [UI Components](#ui-components)

---

## Architecture Overview

### Technology Stack
- **Frontend Framework**: Vue 3 with Composition API
- **State Management**: Pinia
- **UI Components**: shadcn-vue (Reka UI primitives)
- **Styling**: Tailwind CSS 4
- **Drag and Drop**: Swapy
- **Build Tool**: Vite
- **Testing**: Vitest

### File Structure
```
src/
├── App.vue                 # Main application component
├── main.ts                 # Application entry point
├── style.css               # Global styles and Tailwind configuration
├── background/
│   └── index.ts            # Chrome extension background script
├── stores/
│   └── headers.ts          # Pinia store for state management
├── types/
│   └── index.ts            # TypeScript type definitions
├── lib/
│   └── utils.ts            # Utility functions (cn for class merging)
├── components/
│   ├── ProfileSidebar.vue  # Profile selection sidebar
│   ├── ProfileHeader.vue   # Profile header with actions
│   ├── HeaderList.vue      # List of headers with drag/drop
│   ├── HeaderRow.vue       # Individual header row
│   └── ui/                 # shadcn-vue UI components
└── __tests__/              # Test files
```

---

## Data Types

### HeaderRule
Represents a single HTTP header modification rule.

```typescript
interface HeaderRule {
  id: string                    // Unique identifier (UUID)
  enabled: boolean              // Whether this header is active
  name: string                  // Header name (e.g., "Authorization")
  value: string                 // Header value
  comment: string               // Optional comment/note
  type: 'request' | 'response'  // Header type
  operation: 'set' | 'remove' | 'append'  // How to modify the header
}
```

**Operations:**
- `set`: Replace or add the header with the specified value
- `remove`: Remove the header from requests/responses
- `append`: Append the value to an existing header

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
- `dnr_url_filter`: Legacy “advanced” glob matching (supports `*`)

### Profile
A collection of header rules and URL filters.

```typescript
interface Profile {
  id: string                    // Unique identifier
  name: string                  // Display name
  color: string                 // Profile color (hex)
  headers: HeaderRule[]         // Header modification rules
  urlFilters: UrlFilter[]       // URL filters
  createdAt: number             // Creation timestamp
  updatedAt: number             // Last modification timestamp
}
```

### AppState
The complete application state.

```typescript
interface AppState {
  profiles: Profile[]           // All profiles
  activeProfileId: string | null // Currently selected profile
  darkModePreference: DarkModePreference // Dark mode preference: 'system' | 'light' | 'dark'
}
```

---

## Profile Management

### Features

#### 1. Profile Sidebar (`ProfileSidebar.vue`)
- **Location**: Left side of the application
- **Display**: Numbered colored circles for each profile
- **Interactions**:
  - Click to select a profile
  - Drag and drop to reorder profiles
  - "+" button to add new profile
- **Tooltips**: Hover shows profile name

#### 2. Create Profile
- **Action**: Click "+" button in sidebar
- **Behavior**:
  - Creates new profile named "Profile N" (N = count + 1)
  - Assigns next color from `DEFAULT_PROFILE_COLORS` array
  - Automatically switches to the new profile
  - Saves to history for undo support

#### 3. Select Profile
- **Action**: Click profile button in sidebar
- **Behavior**:
  - Updates `activeProfileId` in store
  - UI updates to show selected profile's headers
  - Persists to storage

#### 4. Rename Profile
- **Action**: Double-click profile name in header bar
- **Behavior**:
  - Inline edit mode with input field
  - Press Enter or blur to confirm
  - Press Escape to cancel
  - Empty names are rejected

#### 5. Duplicate Profile
- **Action**: More menu (⋮) → "Duplicate profile"
- **Behavior**:
  - Creates exact copy with "(Copy)" suffix
  - New unique ID and timestamps
  - Switches to the new copy

#### 6. Delete Profile
- **Action**: More menu (⋮) → "Delete profile"
- **Behavior**:
  - Shows confirmation dialog
  - Removes profile from list
  - If deleted profile was active, switches to first profile
  - Ensures at least one profile always exists (creates default if needed)

#### 7. Reorder Profiles
- **Action**: Drag and drop in sidebar
- **Implementation**: Uses Swapy library
- **Behavior**:
  - Visual feedback during drag
  - Persists new order to storage
  - Updates profile numbering

---

## Header Management

### Features

#### Request vs. Response Tabs (Popup UI)
- The popup UI provides **Request** and **Response** tabs to edit each header type separately (with per-tab counts).
- The popup also provides a **Filters** tab for URL filters.
- Header list actions (ADD/CLEAR) are shown in a sticky footer.

#### 1. Header List (`HeaderList.vue`)
- **Display**: Scrollable list of header rows (drag & drop reorder)
- **Header Type Switcher**: The popup UI uses Request/Response tabs to switch which header type is being edited

#### 2. Add Header
- **Action**:
  - "+" button in profile header
  - "ADD" button in the sticky footer
- **Behavior**:
  - Creates new empty header with `enabled: true`
  - Type defaults to 'request'
  - Operation defaults to 'set'

#### 3. Header Row (`HeaderRow.vue`)
- **Components**:
  - Drag handle (grip icon)
  - Enable/disable checkbox
  - Header name input
  - Header value input
  - Comment input (always visible)
  - More menu (⋮)

#### 4. Edit Header Fields
- **Name**: Free text input for header name
- **Value**: Free text input for value (disabled for 'remove' operation)
- **Comment**: Optional note/description

#### 5. Toggle Header
- **Action**: Click checkbox
- **Behavior**: Toggles `enabled` state

#### 6. Duplicate Header
- **Action**: More menu (⋮) → "Duplicate"
- **Behavior**:
  - Creates exact copy
  - Inserts after original
  - New unique ID

#### 7. Delete Header
- **Action**: More menu (⋮) → "Delete"
- **Behavior**: Removes header from profile

#### 8. Clear All Headers
- **Action**: "CLEAR" button in the sticky footer
- **Behavior**: Removes all headers of that type

#### 9. Reorder Headers
- **Action**: Drag and drop using grip handle
- **Implementation**: Uses Swapy library
- **Behavior**:
  - Visual feedback during drag
  - Persists new order
  - Only reorders within same type

---

## URL Filters

### Features

#### 1. Manage URL Filters (UI)
- **Component**: `UrlFilterList.vue` + `UrlFilterRow.vue`
- **Location**: Shown in a dedicated “Filters” tab in the main content area
- **Controls**:
  - Add/Clear actions are shown in a sticky footer
  - Info tooltip on the “URL filters” tab explains matching is against the current tab URL
  - Enable/disable each filter
  - Choose include/exclude
  - Choose match type:
    - Host equals
    - Host ends with
    - URL starts with
    - URL contains
    - Advanced (glob)
    - Regex
  - Edit the pattern
  - Delete filters

#### 2. Store API
- `addUrlFilter(type: 'include' | 'exclude')`
- `updateUrlFilter(filterId, updates)`
- `removeUrlFilter(filterId)`
- `clearUrlFilters()`

### Filter Behavior (Top-level site / tab URL)
- Filters are evaluated against the **current tab URL** (the top-level site you’re visiting).
- **Exclude filters**: If any enabled exclude filter matches the tab URL, the profile is disabled for that tab.
- **Include filters**:
  - If no enabled include filters exist, the profile is enabled for all tabs (except excludes).
  - Otherwise, the profile is enabled only for tabs where at least one enabled include filter matches.

### Chrome extension integration
- The background service worker applies the active profile using **declarativeNetRequest session rules** gated by `condition.tabIds`.
- Tab URLs are tracked via `chrome.tabs` events so the session rule is kept up to date as you navigate.

---

## Drag and Drop Reordering

### Implementation
Uses the Swapy library for smooth drag and drop functionality.

### Components Supporting Drag/Drop

#### ProfileSidebar
- Entire profile button is the drag handle
- Reorders profiles in the sidebar
- Emits `reorder` event with new ID order

#### HeaderList
- Grip icon (`GripVertical`) is the drag handle
- Reorders headers within the list
- Emits `reorder` event with new ID order

### Technical Details
```typescript
// Swapy initialization
swapy.value = createSwapy(container.value, {
  manualSwap: true,    // Control swap timing
  animation: 'dynamic', // Smooth animations
})

// Visual feedback during drag
swapy.value.onSwap((event) => {
  slotItemMap.value = event.newSlotItemMap.asArray
})

// Persist on drag end
swapy.value.onSwapEnd((event) => {
  if (event.hasChanged) {
    emit('reorder', newOrderIds)
  }
})
```

---

## Undo/Redo System

### Features

#### History Management
- Maximum 50 history entries
- Saves state after each modifying action

#### Undo
- **Button**: Undo button in profile header (disabled when no history)
- **Store Method**: `undo()`
- **Behavior**: Restores previous state

#### Redo
- **Button**: Redo button in profile header (disabled when no future states)
- **Store Method**: `redo()`
- **Behavior**: Restores next state

### Actions That Save to History
- Add/remove/duplicate profile
- Toggle/update profile
- Add/remove/update/toggle/duplicate header
- Clear headers
- Sort headers
- Reorder headers/profiles
- Import profiles

### Actions That DON'T Save to History
- Select profile (just navigation)
- Toggle dark mode (preference, not data)

---

## Import/Export

### Export Profiles
- **Action**: Download button in profile header
- **Format**: JSON file
- **Filename**: `openheaders-profiles.json`
- **Contents**:
```json
{
  "version": 1,
  "profiles": [...],
  "exportedAt": 1234567890
}
```

### Import Profiles
- **Action**: More menu (⋮) → "Import profiles"
- **Behavior**:
  - Opens file picker for .json files
  - Validates JSON structure
  - Generates new IDs to avoid conflicts
  - Appends to existing profiles
  - Returns true/false for success/failure

---

## Dark Mode

### Theme Selection
- **Action**: More menu (⋮) → Theme selector with three options
- **Options**: System, Light, Dark
- **Store Methods**: `setDarkModePreference(preference)`, `toggleDarkMode()`

### Implementation
- Detects system preference using `matchMedia('(prefers-color-scheme: dark)')`
- Adds/removes `dark` class on `document.documentElement`
- CSS variables in `style.css` define dark theme colors
- Persisted to storage as `darkModePreference`

---

## Chrome Extension Integration

### Background Script (`background/index.ts`)

#### Rule Building
- Converts `HeaderRule` to Chrome's `ModifyHeaderInfo`
- Supports all operations: SET, REMOVE, APPEND
- Builds rules from active profile only

#### Resource Types
Rules apply to all resource types:
- main_frame, sub_frame
- stylesheet, script, image, font
- object, xmlhttprequest, ping
- csp_report, media, websocket
- webtransport, webbundle, other

#### Storage Listener
- Watches for changes to app state
- Automatically updates rules when state changes

#### Lifecycle Events
- `onInstalled`: Initialize rules from storage
- Startup: Load and apply rules

#### Message Handler
- `GET_ACTIVE_RULES`: Returns current active rules

---

## UI Components

### Profile Header (`ProfileHeader.vue`)

#### Props
| Prop | Type | Description |
|------|------|-------------|
| profile | Profile \| null | Current profile |
| profileIndex | number | Index in profiles array |
| canUndo | boolean | Undo button enabled |
| canRedo | boolean | Redo button enabled |
| darkModePreference | DarkModePreference | Current theme preference |

#### Emits
| Event | Payload | Description |
|-------|---------|-------------|
| undo | - | Trigger undo |
| redo | - | Trigger redo |
| addHeader | - | Add new header |
| export | - | Export profiles |
| import | - | Import profiles |
| duplicate | - | Duplicate current profile |
| delete | - | Delete current profile |
| rename | string | Rename profile |
| setDarkMode | DarkModePreference | Set dark mode preference |

#### Buttons (left to right)
1. Profile number badge
2. Profile name (double-click to edit)
3. Undo
4. Add header (+)
5. Redo
6. Export (download)
7. More menu (⋮)

### Header Row (`HeaderRow.vue`)

#### Props
| Prop | Type | Description |
|------|------|-------------|
| header | HeaderRule | The header to display |

#### Emits
| Event | Payload | Description |
|-------|---------|-------------|
| update | Partial\<HeaderRule\> | Update header fields |
| remove | - | Delete this header |
| toggle | - | Toggle enabled state |
| duplicate | - | Duplicate this header |

### Profile Sidebar (`ProfileSidebar.vue`)

#### Props
| Prop | Type | Description |
|------|------|-------------|
| profiles | Profile[] | All profiles |
| activeProfileId | string \| null | Selected profile |

#### Emits
| Event | Payload | Description |
|-------|---------|-------------|
| select | string | Select a profile |
| add | - | Add new profile |
| reorder | string[] | New profile order |

---

## Persistence

### Storage
- **Chrome Extension**: Uses `chrome.storage.local`
- **Development/Fallback**: Uses `localStorage`
- **Key**: `openheaders_state`

### Saved State
```typescript
{
  profiles: Profile[],
  activeProfileId: string | null,
  darkModePreference: DarkModePreference  // 'system' | 'light' | 'dark'
}
```

### Auto-save
State is persisted automatically on:
- Any profile/header modification
- Theme change
- Undo/redo operations

---

## Keyboard Shortcuts

### Profile Name Editing
- **Enter**: Confirm edit
- **Escape**: Cancel edit

### General
- Standard browser shortcuts apply (Ctrl+Z for undo in inputs, etc.)
