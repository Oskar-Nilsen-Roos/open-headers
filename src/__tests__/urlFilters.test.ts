import { describe, expect, it } from 'vitest'
import type { Profile, UrlFilter } from '@/types'
import {
  ALL_REQUESTS_CONDITION,
  collectRegexFilters,
  filterToCondition,
  hasActiveIncludeFilter,
  isRegexSupported,
  normalizeHostPattern,
  resolveProfileConditions,
  type RequestCondition,
} from '@/lib/urlFilters'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-id',
    name: 'Test Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function createFilter(overrides: Partial<UrlFilter> = {}): UrlFilter {
  return {
    id: 'filter-id',
    enabled: true,
    type: 'include',
    matchType: 'host_equals',
    pattern: '',
    ...overrides,
  }
}

/**
 * Approximates how Chrome evaluates a DNR condition against a request URL so the
 * generated conditions can be checked behaviourally. Supports the urlFilter subset
 * this module emits (`*` wildcard and `|` anchors).
 */
function conditionMatches(condition: RequestCondition, requestUrl: string): boolean {
  if (condition.regexFilter) return new RegExp(condition.regexFilter).test(requestUrl)
  if (condition.requestDomains) {
    const host = new URL(requestUrl).hostname
    return condition.requestDomains.some(d => host === d || host.endsWith(`.${d}`))
  }
  if (condition.urlFilter !== undefined) {
    let pattern = condition.urlFilter
    const startAnchored = pattern.startsWith('|')
    const endAnchored = pattern.endsWith('|')
    if (startAnchored) pattern = pattern.slice(1)
    if (endAnchored) pattern = pattern.slice(0, -1)
    const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
    return new RegExp(`${startAnchored ? '^' : ''}${body}${endAnchored ? '$' : ''}`).test(requestUrl)
  }
  return false
}

function matches(filter: Partial<UrlFilter>, requestUrl: string): boolean {
  const condition = filterToCondition(createFilter(filter))
  return condition !== null && conditionMatches(condition, requestUrl)
}

describe('request filters', () => {
  describe('normalizeHostPattern', () => {
    it('normalizes a hostname', () => {
      expect(normalizeHostPattern('example.com')).toBe('example.com')
    })

    it('extracts hostname from a full URL', () => {
      expect(normalizeHostPattern('https://Example.COM/path')).toBe('example.com')
    })

    it('strips port when present', () => {
      expect(normalizeHostPattern('example.com:8080')).toBe('example.com')
    })

    it('returns null for empty input', () => {
      expect(normalizeHostPattern('   ')).toBeNull()
    })
  })

  describe('filterToCondition', () => {
    it('returns null for disabled or blank filters', () => {
      expect(filterToCondition(createFilter({ pattern: 'example.com', enabled: false }))).toBeNull()
      expect(filterToCondition(createFilter({ pattern: '  ' }))).toBeNull()
    })

    it('host_equals matches the exact host, any port, not subdomains', () => {
      const filter = { matchType: 'host_equals', pattern: 'example.com' } as const
      expect(matches(filter, 'https://example.com/')).toBe(true)
      expect(matches(filter, 'https://example.com:8443/x?y=1')).toBe(true)
      expect(matches(filter, 'wss://example.com/socket')).toBe(true)
      expect(matches(filter, 'https://api.example.com/')).toBe(false)
      expect(matches(filter, 'https://example.com.evil.test/')).toBe(false)
      expect(matches(filter, 'https://evil.test/?u=https://example.com/')).toBe(false)
    })

    it('host_ends_with maps to requestDomains (host and subdomains)', () => {
      const condition = filterToCondition(createFilter({ matchType: 'host_ends_with', pattern: 'https://Example.com/path' }))
      expect(condition).toEqual({ requestDomains: ['example.com'] })
    })

    it('url_starts_with anchors at the start of the URL', () => {
      const withScheme = { matchType: 'url_starts_with', pattern: 'https://example.com/app' } as const
      expect(matches(withScheme, 'https://example.com/app/page')).toBe(true)
      expect(matches(withScheme, 'http://example.com/app')).toBe(false)
      expect(matches(withScheme, 'https://evil.test/?u=https://example.com/app')).toBe(false)

      const withoutScheme = { matchType: 'url_starts_with', pattern: 'example.com/app' } as const
      expect(matches(withoutScheme, 'https://example.com/app/page')).toBe(true)
      expect(matches(withoutScheme, 'http://example.com/app')).toBe(true)
      expect(matches(withoutScheme, 'https://example.com/other')).toBe(false)
    })

    it('url_starts_with escapes regex characters in the pattern', () => {
      const filter = { matchType: 'url_starts_with', pattern: 'example.com/a+b' } as const
      expect(matches(filter, 'https://example.com/a+b')).toBe(true)
      expect(matches(filter, 'https://exampleXcom/aab')).toBe(false)
    })

    it('path_starts_with matches the path only', () => {
      const filter = { matchType: 'path_starts_with', pattern: '/api' } as const
      expect(matches(filter, 'https://example.com/api/users')).toBe(true)
      expect(matches(filter, 'https://example.com:8080/api')).toBe(true)
      expect(matches(filter, 'https://example.com/other/api')).toBe(false)
      expect(matches(filter, 'https://example.com/?next=/api')).toBe(false)
      expect(matches({ matchType: 'path_starts_with', pattern: 'api' }, 'https://example.com/api')).toBe(true)
    })

    it('url_contains uses a plain urlFilter when the pattern has no special characters', () => {
      expect(filterToCondition(createFilter({ matchType: 'url_contains', pattern: 'api/v1' }))).toEqual({
        urlFilter: 'api/v1',
      })
    })

    it('url_contains treats * ^ | literally by falling back to a regex', () => {
      const filter = { matchType: 'url_contains', pattern: 'a*b' } as const
      expect(matches(filter, 'https://example.com/a*b')).toBe(true)
      expect(matches(filter, 'https://example.com/axxb')).toBe(false)
    })

    it('localhost_port matches localhost with an optional port', () => {
      const any = { matchType: 'localhost_port', pattern: '' } as const
      expect(matches(any, 'http://localhost/')).toBe(true)
      expect(matches(any, 'http://localhost:3000/x')).toBe(true)
      expect(matches(any, 'http://localhost.evil.test/')).toBe(false)
      expect(matches(any, 'http://127.0.0.1:3000/')).toBe(false)

      const port = { matchType: 'localhost_port', pattern: 'localhost:3000' } as const
      expect(matches(port, 'http://localhost:3000/')).toBe(true)
      expect(matches(port, 'http://localhost:30001/')).toBe(false)
      expect(matches(port, 'http://localhost:4000/')).toBe(false)

      expect(matches({ matchType: 'localhost_port', pattern: ':8080' }, 'http://localhost:8080/')).toBe(true)
      expect(matches({ matchType: 'localhost_port', pattern: 'http://localhost:8080' }, 'http://localhost:8080/')).toBe(true)
    })

    it('localhost_port treats default ports as the bare host', () => {
      expect(matches({ matchType: 'localhost_port', pattern: '80' }, 'http://localhost/')).toBe(true)
      expect(matches({ matchType: 'localhost_port', pattern: '80' }, 'https://localhost/')).toBe(false)
      expect(matches({ matchType: 'localhost_port', pattern: '443' }, 'https://localhost/')).toBe(true)
      expect(matches({ matchType: 'localhost_port', pattern: '443' }, 'http://localhost/')).toBe(false)
    })

    it('localhost_port returns null for patterns that are not localhost', () => {
      expect(filterToCondition(createFilter({ matchType: 'localhost_port', pattern: 'example.com' }))).toBeNull()
      expect(filterToCondition(createFilter({ matchType: 'localhost_port', pattern: 'https://example.com:3000' }))).toBeNull()
    })

    it('dnr_url_filter anchors both ends and treats * as a wildcard', () => {
      const filter = { matchType: 'dnr_url_filter', pattern: 'https://*.example.com/*' } as const
      expect(filterToCondition(createFilter(filter))).toEqual({ urlFilter: '|https://*.example.com/*' })
      expect(matches(filter, 'https://api.example.com/v1')).toBe(true)
      expect(matches(filter, 'http://api.example.com/v1')).toBe(false)

      // Anchored at the start: the pattern cannot match somewhere in the middle of the URL.
      const prefixed = { matchType: 'dnr_url_filter', pattern: 'https://example.com/*' } as const
      expect(matches(prefixed, 'https://example.com/v1')).toBe(true)
      expect(matches(prefixed, 'https://evil.test/?u=https://example.com/v1')).toBe(false)

      expect(matches({ matchType: 'dnr_url_filter', pattern: 'https://example.com/api' }, 'https://example.com/api')).toBe(true)
      expect(matches({ matchType: 'dnr_url_filter', pattern: 'https://example.com/api' }, 'https://example.com/api/x')).toBe(false)
    })

    it('dnr_url_filter keeps patterns the user already anchored', () => {
      expect(filterToCondition(createFilter({ matchType: 'dnr_url_filter', pattern: '||example.com^' }))).toEqual({
        urlFilter: '||example.com^',
      })
      expect(filterToCondition(createFilter({ matchType: 'dnr_url_filter', pattern: '*' }))).toEqual({ urlFilter: '*' })
    })

    it('dnr_url_filter rejects non-ASCII and invalid patterns', () => {
      expect(filterToCondition(createFilter({ matchType: 'dnr_url_filter', pattern: 'https://exämple.com/*' }))).toBeNull()
      expect(filterToCondition(createFilter({ matchType: 'dnr_url_filter', pattern: '||*.example.com' }))).toBeNull()
    })

    it('defaults to glob matching when matchType is missing', () => {
      const filter = createFilter({ pattern: '*.example.com/*' })
      delete (filter as Partial<UrlFilter>).matchType
      expect(filterToCondition(filter)).toEqual({ urlFilter: '*.example.com/*' })
    })

    it('regex passes the pattern through as regexFilter', () => {
      expect(filterToCondition(createFilter({ matchType: 'regex', pattern: 'https?://(www\\.)?example\\.com/.*' }))).toEqual({
        regexFilter: 'https?://(www\\.)?example\\.com/.*',
      })
    })
  })

  describe('hasActiveIncludeFilter', () => {
    it('ignores disabled, blank and exclude filters', () => {
      expect(hasActiveIncludeFilter([])).toBe(false)
      expect(hasActiveIncludeFilter([createFilter({ pattern: 'a.com', enabled: false })])).toBe(false)
      expect(hasActiveIncludeFilter([createFilter({ pattern: '' })])).toBe(false)
      expect(hasActiveIncludeFilter([createFilter({ pattern: 'a.com', type: 'exclude' })])).toBe(false)
    })

    it('counts enabled include filters, including a blank localhost filter', () => {
      expect(hasActiveIncludeFilter([createFilter({ pattern: 'a.com' })])).toBe(true)
      expect(hasActiveIncludeFilter([createFilter({ matchType: 'localhost_port', pattern: '' })])).toBe(true)
    })
  })

  describe('resolveProfileConditions', () => {
    it('applies to all requests when there are no include filters', () => {
      expect(resolveProfileConditions(createProfile())).toEqual({ includes: [ALL_REQUESTS_CONDITION], excludes: [] })
    })

    it('applies to all requests when include filters are only blank or disabled', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ id: 'a', pattern: '' }),
          createFilter({ id: 'b', pattern: 'a.com', enabled: false }),
        ],
      })
      expect(resolveProfileConditions(profile).includes).toEqual([ALL_REQUESTS_CONDITION])
    })

    it('keeps excludes when there are no include filters', () => {
      const profile = createProfile({
        urlFilters: [createFilter({ type: 'exclude', matchType: 'host_ends_with', pattern: 'ads.test' })],
      })
      expect(resolveProfileConditions(profile)).toEqual({
        includes: [ALL_REQUESTS_CONDITION],
        excludes: [{ requestDomains: ['ads.test'] }],
      })
    })

    it('returns one condition per include filter', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ id: 'a', matchType: 'host_ends_with', pattern: 'a.com' }),
          createFilter({ id: 'b', matchType: 'host_ends_with', pattern: 'b.com' }),
        ],
      })
      expect(resolveProfileConditions(profile).includes).toEqual([
        { requestDomains: ['a.com'] },
        { requestDomains: ['b.com'] },
      ])
    })

    it('applies to nothing — not everything — when every include filter is invalid', () => {
      const profile = createProfile({
        urlFilters: [createFilter({ matchType: 'localhost_port', pattern: 'example.com' })],
      })
      expect(resolveProfileConditions(profile).includes).toEqual([])
    })

    it('drops an include regex that Chrome cannot evaluate', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ id: 'a', matchType: 'regex', pattern: '(?=lookahead)' }),
          createFilter({ id: 'b', matchType: 'host_ends_with', pattern: 'b.com' }),
        ],
      })
      const { includes } = resolveProfileConditions(profile, regex => regex !== '(?=lookahead)')
      expect(includes).toEqual([{ requestDomains: ['b.com'] }])
    })

    it('fails closed when an exclude filter cannot be expressed', () => {
      const invalidHost = createProfile({
        urlFilters: [
          createFilter({ id: 'i', matchType: 'host_ends_with', pattern: 'a.com' }),
          createFilter({ id: 'e', type: 'exclude', matchType: 'localhost_port', pattern: 'example.com' }),
        ],
      })
      expect(resolveProfileConditions(invalidHost)).toEqual({ includes: [], excludes: [] })

      const unsupportedRegex = createProfile({
        urlFilters: [createFilter({ type: 'exclude', matchType: 'regex', pattern: '(?=x)' })],
      })
      expect(resolveProfileConditions(unsupportedRegex, () => false)).toEqual({ includes: [], excludes: [] })
    })
  })

  describe('regex support', () => {
    it('collects every regexFilter a profile needs', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ id: 'a', matchType: 'regex', pattern: 'foo.*' }),
          createFilter({ id: 'b', matchType: 'host_ends_with', pattern: 'b.com' }),
          createFilter({ id: 'c', type: 'exclude', matchType: 'regex', pattern: 'bar' }),
        ],
      })
      expect(collectRegexFilters(profile).sort()).toEqual(['bar', 'foo.*'])
    })

    it('falls back to JavaScript RegExp validation outside the extension', async () => {
      expect(await isRegexSupported('^https://example\\.com/')).toBe(true)
      expect(await isRegexSupported('(unclosed')).toBe(false)
    })
  })
})
