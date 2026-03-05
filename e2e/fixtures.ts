import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

import type { AppState, HeaderRule, Profile, UrlFilter } from '../src/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist')
const TEST_SERVER_URL = `http://localhost:${process.env.TEST_SERVER_PORT || 3456}`
const STORAGE_KEY = 'openheaders_state'

export type TestFixtures = {
  context: BrowserContext
  extensionId: string
  background: Worker
  testPage: Page
  testServerUrl: string
}

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    if (!fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'))) {
      throw new Error(
        `Extension not built. Run "bun run build" first.\nExpected manifest at: ${path.join(EXTENSION_PATH, 'manifest.json')}`,
      )
    }

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openheaders-e2e-'))

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-default-apps',
      ],
    })

    await use(context)
    await context.close()

    fs.rmSync(userDataDir, { recursive: true, force: true })
  },

  background: async ({ context }, use) => {
    let bg = context.serviceWorkers()[0]
    if (!bg) {
      bg = await context.waitForEvent('serviceworker', { timeout: 10000 })
    }
    await use(bg)
  },

  extensionId: async ({ background }, use) => {
    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },

  testPage: async ({ context }, use) => {
    const page = await context.newPage()
    await use(page)
    await page.close()
  },

  testServerUrl: async ({}, use) => {
    await use(TEST_SERVER_URL)
  },
})

export { expect } from '@playwright/test'

// ──────────────────────────────────────────────────────────────────────────────
// State helpers
// ──────────────────────────────────────────────────────────────────────────────

let idCounter = 0
function generateTestId(): string {
  return `test-${Date.now()}-${++idCounter}`
}

export function makeHeader(overrides: Partial<HeaderRule> = {}): HeaderRule {
  return {
    id: generateTestId(),
    enabled: true,
    name: '',
    value: '',
    comment: '',
    type: 'request',
    operation: 'set',
    ...overrides,
  }
}

export function makeUrlFilter(overrides: Partial<UrlFilter> = {}): UrlFilter {
  return {
    id: generateTestId(),
    enabled: true,
    matchType: 'url_contains',
    pattern: '',
    type: 'include',
    ...overrides,
  }
}

export function makeProfile(overrides: Partial<Profile> & { headers?: HeaderRule[]; urlFilters?: UrlFilter[] } = {}): Profile {
  return {
    id: generateTestId(),
    name: 'Test Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

export function makeState(profiles: Profile[], activeProfileId?: string): AppState {
  return {
    profiles,
    activeProfileId: activeProfileId ?? profiles[0]?.id ?? null,
    darkModePreference: 'light',
    languagePreference: 'en',
  }
}

/**
 * Inject state via the service worker (bypasses popup entirely).
 */
export async function injectState(background: Worker, state: AppState): Promise<void> {
  await background.evaluate(
    async ({ key, value }) => {
      await chrome.storage.local.set({ [key]: value })
    },
    { key: STORAGE_KEY, value: state },
  )
}

/**
 * Navigate the test page to the test server and wait for the background
 * script to track the tab and apply declarativeNetRequest rules.
 *
 * Uses polling instead of a fixed timeout to avoid flakiness.
 */
export async function navigateAndWaitForRules(
  testPage: Page,
  testServerUrl: string,
  background: Worker,
): Promise<void> {
  await testPage.goto(testServerUrl, { waitUntil: 'load' })

  // Poll the background script until it has the test page's tab in its
  // tracked URLs and has finished its latest rule update.
  await pollUntil(async () => {
    const ready = await background.evaluate(async () => {
      // Access internal state: latestState should be set and no pending updates
      const rules = await chrome.declarativeNetRequest.getSessionRules()
      return rules.length > 0
    })
    return ready
  }, 5000)
}

/**
 * Poll a condition with exponential backoff.
 */
async function pollUntil(
  fn: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs = 100,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await fn()) return
    await new Promise(r => setTimeout(r, intervalMs))
    intervalMs = Math.min(intervalMs * 1.5, 500)
  }
  // Don't throw - some tests expect no rules (e.g. exclude filter tests).
  // The test assertions will handle verification.
}

/**
 * Wait for the background script to update rules (without navigation).
 * Useful after mid-test state injection or profile switching.
 */
export async function waitForRulesUpdate(
  background: Worker,
  expectedRuleCount?: number,
): Promise<void> {
  await pollUntil(async () => {
    const rules = await background.evaluate(async () => {
      return (await chrome.declarativeNetRequest.getSessionRules()).length
    })
    if (expectedRuleCount !== undefined) return rules === expectedRuleCount
    return rules > 0
  }, 5000)
}

/**
 * Fetch /echo from the test page and return request headers.
 */
export async function fetchEchoHeaders(testPage: Page, testServerUrl: string): Promise<Record<string, string>> {
  return await testPage.evaluate(async (url) => {
    const response = await fetch(`${url}/echo`, { cache: 'no-store' })
    const data = await response.json()
    return data.headers
  }, testServerUrl)
}

/**
 * Fetch a URL from the test page and return response headers.
 */
export async function fetchResponseHeaders(testPage: Page, url: string): Promise<Record<string, string>> {
  return await testPage.evaluate(async (fetchUrl) => {
    const response = await fetch(fetchUrl, { cache: 'no-store' })
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }, url)
}
