# OpenHeaders - Testing Documentation

## Overview

The test suite uses Vitest as the testing framework, with Vue Test Utils for component testing. All tests are written in TypeScript and follow consistent patterns.

## Running Tests

```bash
# Run all tests once
bun run test:run

# Run tests in watch mode
bun run test

# Run specific test file
bun run test:run src/__tests__/store.test.ts
```

## Test Structure

```
src/__tests__/
├── background.test.ts           # Background script logic tests
├── store.test.ts                # Pinia store unit tests
├── types.test.ts                # Type factory function tests
├── components/
│   ├── HeaderRow.test.ts        # HeaderRow component tests
│   ├── ProfileHeader.test.ts    # ProfileHeader component tests
│   └── ProfileSidebar.test.ts   # ProfileSidebar component tests
└── integration/
    └── workflow.test.ts         # End-to-end workflow tests
```

## Test Categories

### 1. Store Tests (`store.test.ts`)
**49 tests** covering the Pinia store functionality.

#### Initialization
- Empty state on creation
- Default profile creation on load
- Loading from localStorage

#### Profile Management
- Adding profiles
- Removing profiles (with minimum guarantee)
- Duplicating profiles
- Toggling profile enabled state
- Updating profile properties
- Reordering profiles

#### Header Management
- Adding request/response headers
- Removing headers
- Updating header properties
- Toggling header enabled state
- Clearing headers by type
- Sorting headers by name/value/comment
- Reordering headers
- Duplicating headers

#### URL Filters
- Adding include/exclude filters
- Updating filter patterns
- Removing filters

#### Undo/Redo
- Basic undo/redo operations
- Clearing redo history on new action
- Multiple undo operations
- Edge cases (unavailable undo/redo)

#### Import/Export
- Exporting profiles as JSON
- Importing valid profiles
- Rejecting invalid JSON
- Handling missing fields gracefully

#### Persistence
- Saving to localStorage
- Loading from localStorage
- Handling corrupted data

#### Dark Mode
- Toggle functionality
- Persistence across sessions

#### Profile Switching
- Isolated headers per profile
- Maintaining state when switching
- Active profile filtering

#### Edge Cases
- Operations on non-existent entities
- Operations without active profile
- Invalid profile IDs
- Color cycling for new profiles

### 2. Type Tests (`types.test.ts`)
**9 tests** for factory functions.

#### createEmptyHeader
- Default request type
- Response type creation
- Unique ID generation

#### createEmptyProfile
- Default name
- Custom name
- Unique ID generation
- Timestamp initialization

#### DEFAULT_PROFILE_COLORS
- Contains multiple colors
- Valid hex format

### 3. Background Script Tests (`background.test.ts`)
**23 tests** for Chrome extension logic.

#### headerOperationToChrome
- SET operation conversion
- REMOVE operation conversion
- APPEND operation conversion
- Default fallback

#### buildRulesFromActiveProfile
- Empty results for missing/disabled profile
- Empty results for no enabled headers
- Request header rule creation
- Response header rule creation
- Combined request/response rules
- Remove operation without value
- Append operation handling
- URL filter application
- Multiple include filters
- Filter validation (disabled, empty)
- Rule ID assignment
- Priority setting

### 4. Component Tests

#### HeaderRow Tests (`HeaderRow.test.ts`)
**12 tests** for the header row component.

**Rendering:**
- Header name input
- Header value input
- Header comment input
- Checkbox enabled/disabled states

**Events:**
- Toggle on checkbox click
- Update events for name/value/comment
- Menu item rendering

**Structure:**
- Drag handle presence

#### ProfileHeader Tests (`ProfileHeader.test.ts`)
**22 tests** for the profile header component.

**Rendering:**
- Profile name display
- Profile index badge
- Pause/Play icons
- Dark mode icons
- Profile color styling

**Button States:**
- Undo button disabled/enabled
- Redo button disabled/enabled

**Events:**
- Undo button click
- Redo button click
- Add header button click
- Toggle profile button click
- Export button click
- Menu item rendering

**Features:**
- Inline editing mode
- Null profile handling

#### ProfileSidebar Tests (`ProfileSidebar.test.ts`)
**12 tests** for the profile sidebar component.

**Rendering:**
- Profile buttons for each profile
- Profile numbers
- Profile colors
- Status indicators (green/red)
- Add button

**Events:**
- Profile selection
- Add profile

**States:**
- Active profile styling
- Empty state

**Drag & Drop:**
- Swapy slot/item attributes

### 5. Integration Tests (`workflow.test.ts`)
**10 tests** for complete user workflows.

#### Complete Header Management
- Create profile → add headers → modify → export → undo

#### Multi-Profile Workflow
- Multiple profiles with different headers
- Profile switching and isolation
- Reordering and deletion

#### Import/Export Workflow
- Export from one store → import to another
- ID regeneration verification

#### Undo/Redo Workflow
- Complex sequences
- History clearing on new action

#### URL Filter Workflow
- Filter CRUD operations
- Header integration

#### Profile Toggle Workflow
- Profile enable/disable
- Header toggle

#### Dark Mode Persistence
- Cross-session persistence

#### Header Sorting
- Sort by name/value/comment

#### Header Duplication
- Duplicate and modify independently

#### Full Feature Profile
- Complete configuration test

## Test Patterns

### Store Testing
```typescript
describe('useHeadersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('performs action correctly', async () => {
    const store = useHeadersStore()
    await store.loadState()

    // Perform action
    store.addProfile()

    // Assert result
    expect(store.profiles.length).toBe(2)
  })
})
```

### Component Testing
```typescript
const mountComponent = (props = {}) => {
  return mount(Component, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        // Stub child components
        Button: { template: '<button><slot /></button>' },
      },
    },
  })
}

it('emits event on action', async () => {
  const wrapper = mountComponent()
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('eventName')).toBeTruthy()
})
```

### Integration Testing
```typescript
it('completes workflow', async () => {
  const store = useHeadersStore()
  await store.loadState()

  // Step 1
  store.addProfile()

  // Step 2
  store.addHeader('request')

  // Step 3
  store.updateHeader(...)

  // Verify final state
  expect(store.requestHeaders[0]?.name).toBe('Expected')
})
```

## Mocking

### Chrome API
```typescript
vi.stubGlobal('chrome', undefined)
```

### Swapy Library
```typescript
vi.mock('swapy', () => ({
  createSwapy: vi.fn(() => ({
    onSwap: vi.fn(),
    onSwapEnd: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
  })),
  utils: {
    initSlotItemMap: vi.fn(() => []),
    toSlottedItems: vi.fn((items) => items.map(...)),
    dynamicSwapy: vi.fn(),
  },
}))
```

### Lucide Icons
```typescript
vi.mock('lucide-vue-next', () => ({
  Plus: { template: '<span>Plus</span>' },
  // ... other icons
}))
```

## Coverage Summary

| Category | Tests | Coverage Areas |
|----------|-------|----------------|
| Store | 49 | All store methods, state management, persistence |
| Types | 9 | Factory functions, constants |
| Background | 23 | Chrome rule building, header operations |
| HeaderRow | 12 | Rendering, events, structure |
| ProfileHeader | 22 | Rendering, states, events |
| ProfileSidebar | 12 | Rendering, events, drag/drop |
| Integration | 10 | Complete workflows |
| **Total** | **137** | |

## Known Limitations

1. **Component Event Testing**: Some dropdown menu events are verified through structure rather than emission due to stub limitations.

2. **Chrome API**: Background script tests use recreated pure functions rather than testing actual Chrome API integration.

3. **Swapy Integration**: Drag and drop functionality is verified through attribute presence rather than actual drag simulation.

## Adding New Tests

1. **Store Tests**: Add to appropriate `describe` block in `store.test.ts`
2. **Component Tests**: Create new file in `components/` directory
3. **Integration Tests**: Add to `workflow.test.ts` for multi-step scenarios
4. **New Categories**: Create new test file in `__tests__/` directory

## CI/CD Integration

The test suite is designed to run in CI environments:

```bash
# Exit with error code on failure
bun run test:run
```

Add to your CI workflow:
```yaml
- name: Run Tests
  run: bun run test:run
```
