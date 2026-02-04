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
| `activeProfileId` | `Ref<string | null>` | Currently selected profile ID |
| `darkModePreference` | `Ref<DarkModePreference>` | Theme preference (`'system' | 'light' | 'dark'`) |
| `languagePreference` | `Ref<LanguagePreference>` | Language preference (`'auto' | 'en' | 'sv'`) |
| `isInitialized` | `Ref<boolean>` | Whether the store has finished loading from storage |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| `activeProfile` | `ComputedRef<Profile | null>` | The currently active profile object |
| `requestHeaders` | `ComputedRef<HeaderRule[]>` | Request headers from active profile |
| `responseHeaders` | `ComputedRef<HeaderRule[]>` | Response headers from active profile |
| `isDarkMode` | `ComputedRef<boolean>` | Effective dark mode state (respects system preference) |
| `canUndo` | `ComputedRef<boolean>` | Whether undo is available |
| `canRedo` | `ComputedRef<boolean>` | Whether redo is available |

---

## Methods

### Initialization

#### `loadState(): Promise<void>`
Loads state from storage (`chrome.storage.local` or `localStorage`).

```typescript
const store = useHeadersStore()
await store.loadState()
```

**Behavior:**
- Loads `profiles`, `activeProfileId`, `darkModePreference`, and `languagePreference`
- Migrates old state formats:
  - Old `darkMode` boolean → `darkModePreference`
  - Missing `matchType` in URL filters defaults to `'dnr_url_filter'`
- Validates `languagePreference` to `auto | en | sv`
- Initializes system dark mode detection
- Creates a default profile if none exist
- Sets `activeProfileId` to the first profile if missing
- Initializes undo history with the loaded state
- Sets `isInitialized` to true

---

### Profile Actions

#### `addProfile(): void`
Creates and adds a new profile.

```typescript
store.addProfile()
```

**Behavior:**
- Creates profile named `Profile N`
- Assigns next color from `DEFAULT_PROFILE_COLORS`
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
- Ensures at least one profile always exists
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
- Appends localized “(Copy)” suffix
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
- Updates `activeProfileId`
- Persists (does NOT save to history)

---

#### `updateProfile(profileId: string, updates: Partial<Profile>): void`
Updates profile properties.

```typescript
store.updateProfile(profile.id, { name: 'New Name', color: '#ff0000' })
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
- Rebuilds profile list in new order
- Saves to history and persists

---

### Header Actions

#### `addHeader(type: HeaderType = 'request'): void`
Adds a new header to the active profile.

```typescript
store.addHeader('request')
```

**Behavior:**
- Creates new `HeaderRule` with defaults (`operation: 'set'`)
- Adds to active profile headers
- Saves to history and persists

---

#### `removeHeader(headerId: string): void`
Removes a header by ID.

```typescript
store.removeHeader('header-uuid')
```

---

#### `duplicateHeader(headerId: string): void`
Creates a copy of a header.

```typescript
store.duplicateHeader('header-uuid')
```

**Behavior:**
- Deep clones header
- Generates new ID
- Inserts after the original
- Saves to history and persists

---

#### `updateHeader(headerId: string, updates: Partial<HeaderRule>): void`
Updates header properties.

```typescript
store.updateHeader(header.id, { name: 'Authorization', value: 'Bearer token123' })
```

---

#### `toggleHeader(headerId: string): void`
Toggles header enabled/disabled state.

```typescript
store.toggleHeader('header-uuid')
```

---

#### `clearHeaders(type?: HeaderType): void`
Removes all headers, optionally filtered by type.

```typescript
store.clearHeaders('request')
store.clearHeaders('response')
```

---

#### `sortHeaders(by: 'name' | 'value' | 'comment', type?: HeaderType): void`
Sorts headers alphabetically by a field.

```typescript
store.sortHeaders('name', 'request')
```

---

#### `reorderHeaders(orderedIds: string[], type: HeaderType): void`
Reorders headers based on new ID order.

```typescript
store.reorderHeaders(['id3', 'id1', 'id2'], 'request')
```

---

### URL Filter Actions

#### `addUrlFilter(type: 'include' | 'exclude' = 'include'): void`
Adds a new URL filter to the active profile.

```typescript
store.addUrlFilter('include')
```

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
store.updateUrlFilter('filter-uuid', { matchType: 'host_ends_with', pattern: 'example.com' })
```

---

#### `clearUrlFilters(): void`
Removes all URL filters from the active profile.

```typescript
store.clearUrlFilters()
```

---

#### `reorderUrlFilters(orderedIds: string[]): void`
Reorders URL filters in the active profile.

```typescript
store.reorderUrlFilters(['id3', 'id1', 'id2'])
```

**Behavior:**
- Rebuilds the filter list in the new order
- Keeps any missing IDs at the end (safety)
- Saves to history and persists

---

### History Actions

#### `undo(): void`
Reverts to the previous state.

```typescript
if (store.canUndo) {
  store.undo()
}
```

#### `redo(): void`
Advances to the next state.

```typescript
if (store.canRedo) {
  store.redo()
}
```

---

### Import/Export Actions

#### `exportProfiles(): string`
Exports all profiles as a JSON string.

```typescript
const json = store.exportProfiles()
```

Returns:
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
```

**Behavior:**
- Supports **OpenHeaders** export format and **ModHeader** export format
- Generates new IDs for all profiles/headers/filters
- Appends to existing profiles
- Warns when importing large profile counts
- Returns `true` on success, `false` on failure

---

### Settings Actions

#### `setDarkModePreference(preference: DarkModePreference): void`
Sets the theme preference.

```typescript
store.setDarkModePreference('dark')
```

---

#### `toggleDarkMode(): void`
Cycles theme preference: system → dark → light → system.

```typescript
store.toggleDarkMode()
```

---

#### `setLanguagePreference(preference: LanguagePreference): void`
Sets the UI language preference.

```typescript
store.setLanguagePreference('sv')
```

---

## Persistence

- **Chrome extension**: `chrome.storage.local`
- **Development fallback**: `localStorage`
- **Storage key**: `openheaders_state`

## Internal Methods (Not Exported)

| Method | Description |
|--------|-------------|
| `getState()` | Returns current state as `AppState` object |
| `saveToHistory()` | Saves current state to history |
| `restoreState(state)` | Restores state from history entry |
| `persistState()` | Saves state to storage |
