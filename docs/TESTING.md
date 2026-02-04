# OpenHeaders - Testing Documentation

## Overview

The test suite uses **Vitest** for unit/integration tests and **Playwright** for browser e2e tests. All tests are written in TypeScript.

## Running Tests

```bash
# Run all Vitest tests once
bun run test:run

# Run Vitest in watch mode
bun run test
```

```bash
# Run Playwright e2e tests
bunx playwright test

# If Playwright browsers are missing
bunx playwright install
```

Playwright uses the dev server from `playwright.config.ts` and runs against `http://localhost:5181`.

---

## Test Structure

```
src/__tests__/
├── background.test.ts           # Background script logic tests
├── store.test.ts                # Pinia store unit tests
├── types.test.ts                # Type factory/utility tests
├── urlFilters.test.ts           # URL filter matching tests
├── components/
│   ├── App.test.ts              # App integration tests
│   ├── HeaderRow.test.ts        # HeaderRow component tests
│   ├── ProfileHeader.test.ts    # ProfileHeader component tests
│   ├── ProfileSidebar.test.ts   # ProfileSidebar component tests
│   ├── UrlFilterList.test.ts    # UrlFilterList component tests
│   └── UrlFilterRow.test.ts     # UrlFilterRow component tests
├── integration/
│   └── workflow.test.ts         # End-to-end workflow tests (Vitest)
└── browser/
    └── e2e.test.ts              # Playwright browser tests
```

---

## Test Categories

### 1. Store Tests (`store.test.ts`)
Covers store initialization, profile management, header operations, URL filters, undo/redo, import/export, persistence, and preferences.

### 2. URL Filter Tests (`urlFilters.test.ts`)
Validates URL matching logic for all match types and include/exclude behavior.

### 3. Background Script Tests (`background.test.ts`)
Validates DNR rule construction, header operations, and URL filter integration.

### 4. Type Tests (`types.test.ts`)
Validates factory helpers and ModHeader conversion behavior.

### 5. Component Tests (`src/__tests__/components/*`)
Ensures key UI components render correctly and emit expected events.

### 6. Integration Tests (`integration/workflow.test.ts`)
Runs end‑to‑end UI workflows under Vitest.

### 7. Playwright E2E (`browser/e2e.test.ts`)
Runs real browser flows (profile and header management, menus, etc.).
