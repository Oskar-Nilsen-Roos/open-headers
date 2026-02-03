# Headers Store API Documentation

The `useHeadersStore` is the central Pinia store managing all application state.

## Import

```typescript
import { useHeadersStore } from '@/stores/headers'
```

## State Properties

### Reactive State

| Property | Type | Description |
|----------|------|-------------|
| `profiles` | `Ref<Profile[]>` | All user profiles |
| `activeProfileId` | `Ref<string \| null>` | Currently selected profile ID |
| `darkModePreference` | `Ref<DarkModePreference>` | Dark mode preference ('system' \| 'light' \| 'dark') |
| `isInitialized` | `Ref<boolean>` | Whether store has loaded from storage |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeProfile` | `ComputedRef<Profile \| null>` | The currently active profile object |
| `requestHeaders` | `ComputedRef<HeaderRule[]>` | Request headers from active profile |
| `responseHeaders` | `ComputedRef<HeaderRule[]>` | Response headers from active profile |
| `isDarkMode` | `ComputedRef<boolean>` | Actual dark mode state (respects system preference) |
| `canUndo` | `ComputedRef<boolean>` | Whether undo is available |
| `canRedo` | `ComputedRef<boolean>` | Whether redo is available |

---

## Methods

### Initialization

#### `loadState(): Promise<void>`
Loads state from storage (chrome.storage or localStorage).

```typescript
const store = useHeadersStore()
await store.loadState()
```

**Behavior:**
- Loads profiles, activeProfileId, and darkModePreference from storage
- Handles migration from old `darkMode` boolean format
- Initializes system dark mode detection
- Creates default profile if none exist
- Sets activeProfileId to first profile if not set
- Initializes history
- Sets isInitialized to true

---

### Profile Actions

#### `addProfile(): void`
Creates and adds a new profile.

```typescript
store.addProfile()
```

**Behavior:**
- Creates profile named "Profile N"
- Assigns color from `DEFAULT_PROFILE_COLORS` (cycling)
- Sets as active profile
- Saves to history and persists

---

#### `removeProfile(profileId: string): void`
Removes a profile by ID.

```typescript
store.removeProfile('profile-uuid')
```

**Behavior:**
- Removes profile from array
- If removed profile was active, switches to first profile
- If no profiles remain, creates a default profile
- Saves to history and persists

---

#### `duplicateProfile(profileId: string): void`
Creates a copy of an existing profile.

```typescript
store.duplicateProfile('profile-uuid')
```

**Behavior:**
- Deep clones the profile
- Generates new ID
- Appends " (Copy)" to name
- Sets as active profile
- Saves to history and persists

---

#### `setActiveProfile(profileId: string): void`
Switches to a different profile.

```typescript
store.setActiveProfile('profile-uuid')
```

**Behavior:**
- Validates profile exists
- Updates activeProfileId
- Persists (but does NOT save to history - navigation only)

---

#### `updateProfile(profileId: string, updates: Partial<Profile>): void`
Updates profile properties.

```typescript
store.updateProfile('profile-uuid', {
  name: 'New Name',
  color: '#ff0000'
})
```

**Behavior:**
- Merges updates into profile
- Updates `updatedAt` timestamp
- Saves to history and persists

---

#### `reorderProfiles(orderedIds: string[]): void`
Reorders profiles based on new ID order.

```typescript
store.reorderProfiles(['id3', 'id1', 'id2'])
```

**Behavior:**
- Rebuilds profiles array in new order
- Saves to history and persists

---

### Header Actions

#### `addHeader(type: HeaderType = 'request'): void`
Adds a new header to the active profile.

```typescript
store.addHeader('request')
store.addHeader('response')
```

**Behavior:**
- Creates new HeaderRule with defaults
- Adds to active profile's headers array
- Saves to history and persists

---

#### `removeHeader(headerId: string): void`
Removes a header by ID.

```typescript
store.removeHeader('header-uuid')
```

**Behavior:**
- Removes from active profile's headers
- Saves to history and persists

---

#### `duplicateHeader(headerId: string): void`
Creates a copy of a header.

```typescript
store.duplicateHeader('header-uuid')
```

**Behavior:**
- Deep clones the header
- Generates new ID
- Inserts after the original
- Saves to history and persists

---

#### `updateHeader(headerId: string, updates: Partial<HeaderRule>): void`
Updates header properties.

```typescript
store.updateHeader('header-uuid', {
  name: 'Authorization',
  value: 'Bearer token123'
})
```

**Behavior:**
- Merges updates into header
- Updates profile's `updatedAt` timestamp
- Saves to history and persists

---

#### `toggleHeader(headerId: string): void`
Toggles header enabled/disabled state.

```typescript
store.toggleHeader('header-uuid')
```

**Behavior:**
- Inverts `enabled` boolean
- Saves to history and persists

---

#### `clearHeaders(type?: HeaderType): void`
Removes all headers, optionally filtered by type.

```typescript
store.clearHeaders('request')  // Clear only request headers
store.clearHeaders('response') // Clear only response headers
store.clearHeaders()           // Clear all headers
```

**Behavior:**
- Removes matching headers from active profile
- Saves to history and persists

---

#### `sortHeaders(by: 'name' | 'value' | 'comment', type?: HeaderType): void`
Sorts headers alphabetically by a field.

```typescript
store.sortHeaders('name', 'request')
```

**Behavior:**
- Sorts case-insensitively
- Only affects specified type (if provided)
- Saves to history and persists

---

#### `reorderHeaders(orderedIds: string[], type: HeaderType): void`
Reorders headers based on new ID order.

```typescript
store.reorderHeaders(['id3', 'id1', 'id2'], 'request')
```

**Behavior:**
- Rebuilds headers of specified type in new order
- Preserves other header types' order
- Saves to history and persists

---

### URL Filter Actions

#### `addUrlFilter(type: 'include' | 'exclude' = 'include'): void`
Adds a new URL filter to the active profile.

```typescript
store.addUrlFilter('include')
store.addUrlFilter('exclude')
```

**Behavior:**
- Creates a new filter with `enabled: true`
- Defaults `matchType` to `'host_equals'`

---

#### `removeUrlFilter(filterId: string): void`
Removes a URL filter by ID.

```typescript
store.removeUrlFilter('filter-uuid')
```

---

#### `updateUrlFilter(filterId: string, updates: Partial<UrlFilter>): void`
Updates URL filter properties.

```typescript
store.updateUrlFilter('filter-uuid', {
  matchType: 'host_ends_with',
  pattern: 'example.com',
  enabled: true
})
```

---

#### `clearUrlFilters(): void`
Removes all URL filters from the active profile.

```typescript
store.clearUrlFilters()
```

---

### History Actions

#### `undo(): void`
Reverts to the previous state.

```typescript
if (store.canUndo) {
  store.undo()
}
```

**Behavior:**
- Decrements history index
- Restores that state
- Persists the restored state

---

#### `redo(): void`
Advances to the next state.

```typescript
if (store.canRedo) {
  store.redo()
}
```

**Behavior:**
- Increments history index
- Restores that state
- Persists the restored state

---

### Import/Export Actions

#### `exportProfiles(): string`
Exports all profiles as JSON string.

```typescript
const json = store.exportProfiles()
// Download as file, etc.
```

**Returns:** JSON string with format:
```json
{
  "version": 1,
  "profiles": [...],
  "exportedAt": 1234567890
}
```

---

#### `importProfiles(jsonString: string): boolean`
Imports profiles from JSON string.

```typescript
const success = store.importProfiles(jsonContent)
if (!success) {
  console.error('Import failed')
}
```

**Behavior:**
- Parses JSON
- Validates structure
- Generates new IDs for all profiles/headers/filters
- Appends to existing profiles
- Returns true on success, false on failure

---

### Settings Actions

#### `setDarkModePreference(preference: DarkModePreference): void`
Sets dark mode preference directly.

```typescript
store.setDarkModePreference('dark')
store.setDarkModePreference('light')
store.setDarkModePreference('system')
```

**Behavior:**
- Updates `darkModePreference`
- Persists (does NOT save to history)

---

#### `toggleDarkMode(): void`
Cycles through dark mode preferences: system → dark → light → system.

```typescript
store.toggleDarkMode()
```

**Behavior:**
- Cycles through preference options
- Persists (does NOT save to history)

---

## Usage Example

```typescript
import { useHeadersStore } from '@/stores/headers'

const store = useHeadersStore()

// Initialize
await store.loadState()

// Create a new profile
store.addProfile()

// Add a header
store.addHeader('request')
const header = store.requestHeaders[0]
if (header) {
  store.updateHeader(header.id, {
    name: 'X-Custom-Header',
    value: 'my-value'
  })
}

// Set dark mode
store.setDarkModePreference('dark')

// Export
const backup = store.exportProfiles()
```

---

## Internal Methods (Not Exported)

These methods are used internally:

| Method | Description |
|--------|-------------|
| `getState()` | Returns current state as `AppState` object |
| `saveToHistory()` | Saves current state to history |
| `restoreState(state)` | Restores state from history entry |
| `persistState()` | Saves state to storage |
