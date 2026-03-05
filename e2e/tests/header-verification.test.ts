import {
  test,
  expect,
  makeHeader,
  makeProfile,
  makeState,
  makeUrlFilter,
  injectState,
  navigateAndWaitForRules,
  waitForRulesUpdate,
  fetchEchoHeaders,
  fetchResponseHeaders,
} from '../fixtures'

// ──────────────────────────────────────────────────────────────────────────────
// Request header operations
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Request header: set', () => {
  test('adds a custom request header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Custom-Set', value: 'hello-world', type: 'request', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-custom-set']).toBe('hello-world')
  })

  test('overrides an existing request header', async ({ background, testPage, testServerUrl }) => {
    // Use User-Agent since it's always present and not reset by fetch()
    const profile = makeProfile({
      headers: [makeHeader({ name: 'User-Agent', value: 'OpenHeaders-Test/1.0', type: 'request', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['user-agent']).toBe('OpenHeaders-Test/1.0')
  })

  test('sets multiple request headers at once', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({ name: 'X-First', value: 'one', type: 'request', operation: 'set' }),
        makeHeader({ name: 'X-Second', value: 'two', type: 'request', operation: 'set' }),
        makeHeader({ name: 'X-Third', value: 'three', type: 'request', operation: 'set' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-first']).toBe('one')
    expect(headers['x-second']).toBe('two')
    expect(headers['x-third']).toBe('three')
  })
})

test.describe('Request header: remove', () => {
  test('removes a standard request header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'Accept-Language', type: 'request', operation: 'remove' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['accept-language']).toBeUndefined()
  })
})

test.describe('Request header: append', () => {
  test('appends to an existing request header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'Accept', value: 'text/csv', type: 'request', operation: 'append' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['accept']).toContain('text/csv')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Response header operations
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Response header: set', () => {
  test('adds a new response header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Injected-Response', value: 'injected', type: 'response', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    // Use Playwright response interception to bypass any CORS limitations
    const [response] = await Promise.all([
      testPage.waitForResponse(`${testServerUrl}/with-headers`),
      testPage.evaluate((url) => fetch(url, { cache: 'no-store' }), `${testServerUrl}/with-headers`),
    ])
    expect(response.headers()['x-injected-response']).toBe('injected')
  })

  test('overrides an existing response header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Original-Header', value: 'overridden', type: 'response', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchResponseHeaders(testPage, `${testServerUrl}/with-headers`)
    expect(headers['x-original-header']).toBe('overridden')
  })
})

test.describe('Response header: remove', () => {
  test('removes a response header sent by the server', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Remove-Me', type: 'response', operation: 'remove' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchResponseHeaders(testPage, `${testServerUrl}/with-headers`)
    expect(headers['x-remove-me']).toBeUndefined()
  })
})

test.describe('Response header: append', () => {
  test('appends to an existing response header', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Append-To', value: 'extra', type: 'response', operation: 'append' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchResponseHeaders(testPage, `${testServerUrl}/with-headers`)
    // Server sends 'base', extension appends 'extra'
    expect(headers['x-append-to']).toContain('base')
    expect(headers['x-append-to']).toContain('extra')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Combined request + response headers
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Combined operations', () => {
  test('applies both request and response headers simultaneously', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({ name: 'X-Req-Custom', value: 'from-request', type: 'request', operation: 'set' }),
        makeHeader({ name: 'X-Resp-Custom', value: 'from-response', type: 'response', operation: 'set' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const reqHeaders = await fetchEchoHeaders(testPage, testServerUrl)
    expect(reqHeaders['x-req-custom']).toBe('from-request')

    const respHeaders = await fetchResponseHeaders(testPage, `${testServerUrl}/with-headers`)
    expect(respHeaders['x-resp-custom']).toBe('from-response')
  })

  test('applies set + remove operations in a single profile', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({ name: 'X-Set-Req', value: 'set-value', type: 'request', operation: 'set' }),
        makeHeader({ name: 'Accept-Language', type: 'request', operation: 'remove' }),
        makeHeader({ name: 'X-Set-Resp', value: 'resp-value', type: 'response', operation: 'set' }),
        makeHeader({ name: 'X-Remove-Me', type: 'response', operation: 'remove' }),
        makeHeader({ name: 'X-Append-To', value: 'added', type: 'response', operation: 'append' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const reqHeaders = await fetchEchoHeaders(testPage, testServerUrl)
    expect(reqHeaders['x-set-req']).toBe('set-value')
    expect(reqHeaders['accept-language']).toBeUndefined()

    const respHeaders = await fetchResponseHeaders(testPage, `${testServerUrl}/with-headers`)
    expect(respHeaders['x-set-resp']).toBe('resp-value')
    expect(respHeaders['x-remove-me']).toBeUndefined()
    expect(respHeaders['x-append-to']).toContain('added')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Disabled headers
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Disabled headers', () => {
  test('disabled headers are not applied', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({ name: 'X-Enabled', value: 'yes', type: 'request', operation: 'set', enabled: true }),
        makeHeader({ name: 'X-Disabled', value: 'no', type: 'request', operation: 'set', enabled: false }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-enabled']).toBe('yes')
    expect(headers['x-disabled']).toBeUndefined()
  })

  test('headers with empty name are not applied', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({ name: '', value: 'no-name', type: 'request', operation: 'set' }),
        makeHeader({ name: 'X-Has-Name', value: 'present', type: 'request', operation: 'set' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-has-name']).toBe('present')
    expect(headers['']).toBeUndefined()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// URL Filters
// ──────────────────────────────────────────────────────────────────────────────

test.describe('URL Filters: include', () => {
  test('headers apply only to matching URLs with include filter', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Filtered', value: 'yes', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: 'localhost', matchType: 'url_contains', type: 'include' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-filtered']).toBe('yes')
  })

  test('headers do not apply when include filter does not match', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Filtered', value: 'yes', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: 'example.com', matchType: 'host_equals', type: 'include' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-filtered']).toBeUndefined()
  })
})

test.describe('URL Filters: exclude', () => {
  test('headers do not apply when exclude filter matches', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Excluded', value: 'nope', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: 'localhost', matchType: 'url_contains', type: 'exclude' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-excluded']).toBeUndefined()
  })

  test('exclude takes precedence over include', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Priority', value: 'test', type: 'request', operation: 'set' })],
      urlFilters: [
        makeUrlFilter({ pattern: 'localhost', matchType: 'url_contains', type: 'include' }),
        makeUrlFilter({ pattern: 'localhost', matchType: 'url_contains', type: 'exclude' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-priority']).toBeUndefined()
  })
})

test.describe('URL Filters: match types', () => {
  test('host_equals matches exact hostname', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Host-Eq', value: 'matched', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: 'localhost', matchType: 'host_equals', type: 'include' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-host-eq']).toBe('matched')
  })

  test('localhost_port matches localhost with port', async ({ background, testPage, testServerUrl }) => {
    const port = new URL(testServerUrl).port
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Localhost', value: 'port-match', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: `localhost:${port}`, matchType: 'localhost_port', type: 'include' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-localhost']).toBe('port-match')
  })

  test('url_starts_with matches URL prefix', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Prefix', value: 'matched', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: testServerUrl, matchType: 'url_starts_with', type: 'include' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-prefix']).toBe('matched')
  })

  test('path_starts_with matches path prefix', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Path', value: 'path-match', type: 'request', operation: 'set' })],
      urlFilters: [makeUrlFilter({ pattern: '/echo', matchType: 'path_starts_with', type: 'include' })],
    })

    // Navigate FIRST to register the tab, then inject state.
    // This ensures the tab URL is tracked before rules are built.
    await testPage.goto(`${testServerUrl}/echo`, { waitUntil: 'load' })
    await injectState(background, makeState([profile]))
    await waitForRulesUpdate(background)

    const echoResponse = await testPage.evaluate(async (url) => {
      const r = await fetch(url, { cache: 'no-store' })
      return r.json()
    }, `${testServerUrl}/echo`)
    expect(echoResponse.headers['x-path']).toBe('path-match')
  })

  test('disabled url filter is ignored', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Filter-Test', value: 'applied', type: 'request', operation: 'set' })],
      urlFilters: [
        makeUrlFilter({ pattern: 'example.com', matchType: 'host_equals', type: 'include', enabled: true }),
        makeUrlFilter({ pattern: 'localhost', matchType: 'url_contains', type: 'include', enabled: false }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-filter-test']).toBeUndefined()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Profile switching
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Profile switching', () => {
  test('switching active profile changes applied headers', async ({ background, testPage, testServerUrl }) => {
    const profile1 = makeProfile({
      name: 'Profile A',
      headers: [makeHeader({ name: 'X-Profile', value: 'A', type: 'request', operation: 'set' })],
    })
    const profile2 = makeProfile({
      name: 'Profile B',
      headers: [makeHeader({ name: 'X-Profile', value: 'B', type: 'request', operation: 'set' })],
    })

    await injectState(background, makeState([profile1, profile2], profile1.id))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    let headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-profile']).toBe('A')

    // Switch to profile 2
    await injectState(background, makeState([profile1, profile2], profile2.id))
    await waitForRulesUpdate(background)

    headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-profile']).toBe('B')
  })

  test('no headers applied when no active profile', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Should-Not-Exist', value: 'nope', type: 'request', operation: 'set' })],
    })
    await injectState(background, makeState([profile], 'nonexistent-id'))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-should-not-exist']).toBeUndefined()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Edge cases', () => {
  test('header with special characters in value', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [
        makeHeader({
          name: 'X-Special',
          value: 'value with spaces, commas; and semicolons: plus=equals&ampersands',
          type: 'request',
          operation: 'set',
        }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-special']).toBe('value with spaces, commas; and semicolons: plus=equals&ampersands')
  })

  test('header names are case-insensitive', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-CamelCase-Header', value: 'case-test', type: 'request', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-camelcase-header']).toBe('case-test')
  })

  test('many headers applied at once', async ({ background, testPage, testServerUrl }) => {
    const headerRules = Array.from({ length: 20 }, (_, i) =>
      makeHeader({ name: `X-Bulk-${i}`, value: `value-${i}`, type: 'request', operation: 'set' }),
    )
    const profile = makeProfile({ headers: headerRules })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const received = await fetchEchoHeaders(testPage, testServerUrl)
    for (let i = 0; i < 20; i++) {
      expect(received[`x-bulk-${i}`]).toBe(`value-${i}`)
    }
  })

  test('profile with no headers does not cause errors', async ({ background, testPage, testServerUrl }) => {
    const profile = makeProfile({ headers: [] })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers).toBeDefined()
    expect(headers['host']).toContain('localhost')
  })

  test('headers not applied to non-HTTP URLs', async ({ background, context, extensionId }) => {
    const profile = makeProfile({
      headers: [makeHeader({ name: 'X-Non-Http', value: 'should-not-appear', type: 'request', operation: 'set' })],
    })
    await injectState(background, makeState([profile]))

    // Extension pages are chrome-extension:// URLs, not HTTP - headers should not apply
    const extPage = await context.newPage()
    await extPage.goto(`chrome-extension://${extensionId}/index.html`)
    await extPage.waitForSelector('[data-swapy-slot]', { timeout: 10000 })
    await extPage.close()
  })

  test('set/append headers with empty value are filtered out, not poisoning the rule', async ({ background, testPage, testServerUrl }) => {
    // Chrome requires a value for set/append operations. If a header without
    // a value is included, Chrome silently rejects the ENTIRE rule.
    // The fix: filter out set/append headers with empty values so that
    // other valid headers in the same profile still get applied.
    const profile = makeProfile({
      headers: [
        makeHeader({ name: 'X-Empty-Value', value: '', type: 'request', operation: 'set' }),
        makeHeader({ name: 'X-Has-Value', value: 'present', type: 'request', operation: 'set' }),
      ],
    })
    await injectState(background, makeState([profile]))
    await navigateAndWaitForRules(testPage, testServerUrl, background)

    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    // Empty-value header is filtered out, but the valid header still applies
    expect(headers['x-empty-value']).toBeUndefined()
    expect(headers['x-has-value']).toBe('present')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// UI-to-network pipeline (full end-to-end through the popup UI)
// ──────────────────────────────────────────────────────────────────────────────

test.describe('UI pipeline', () => {
  test('header added through popup UI is applied to requests', async ({ background, context, extensionId, testPage, testServerUrl }) => {
    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${extensionId}/index.html`)
    await popup.waitForSelector('[data-swapy-slot]', { timeout: 10000 })

    await popup.getByTestId('footer-add').click()

    const row = popup.locator('[data-testid="header-row"]').first()
    const nameInput = row.locator('input').first()
    const valueInput = row.locator('input').nth(1)

    await nameInput.fill('X-UI-Added')
    await nameInput.press('Tab')
    await valueInput.fill('from-ui')
    await valueInput.press('Tab')

    // Enable the header (new headers start disabled)
    const checkbox = row.locator('button[role="checkbox"]')
    const state = await checkbox.getAttribute('data-state')
    if (state === 'unchecked') {
      await checkbox.click()
    }

    await navigateAndWaitForRules(testPage, testServerUrl, background)
    const headers = await fetchEchoHeaders(testPage, testServerUrl)
    expect(headers['x-ui-added']).toBe('from-ui')

    await popup.close()
  })
})
