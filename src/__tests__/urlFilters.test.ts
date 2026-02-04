import { describe, expect, it } from 'vitest'
import type { Profile, UrlFilter } from '@/types'
import { globToRegExp, isProfileEnabledForTabUrl, matchesUrlFilter, normalizeHostPattern } from '@/lib/urlFilters'

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

describe('urlFilters utilities', () => {
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
      expect(normalizeHostPattern('  ')).toBeNull()
    })
  })

  describe('globToRegExp', () => {
    it('treats * as wildcard and anchors the result', () => {
      const re = globToRegExp('*.example.com/*')
      expect(re).not.toBeNull()
      expect(re!.test('https://api.example.com/foo')).toBe(true)
      expect(re!.test('https://example.com/foo')).toBe(false)
    })
  })

  describe('matchesUrlFilter', () => {
    const url = 'https://api.example.com/v1/users?x=1'

    it('matches host_equals', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'host_equals',
        pattern: 'api.example.com',
      }))).toBe(true)

      expect(matchesUrlFilter(url, createFilter({
        matchType: 'host_equals',
        pattern: 'example.com',
      }))).toBe(false)
    })

    it('matches host_ends_with', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'host_ends_with',
        pattern: 'example.com',
      }))).toBe(true)
    })

    it('matches url_starts_with (with scheme)', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'url_starts_with',
        pattern: 'https://api.example.com/v1',
      }))).toBe(true)
    })

    it('matches url_starts_with (without scheme)', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'url_starts_with',
        pattern: 'api.example.com/v1',
      }))).toBe(true)
    })

    it('matches path_starts_with against pathname only', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'path_starts_with',
        pattern: '/v1',
      }))).toBe(true)

      expect(matchesUrlFilter(url, createFilter({
        matchType: 'path_starts_with',
        pattern: 'v1',
      }))).toBe(true)

      expect(matchesUrlFilter(url, createFilter({
        matchType: 'path_starts_with',
        pattern: '/v2',
      }))).toBe(false)
    })

    it('matches url_contains', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'url_contains',
        pattern: 'v1/users',
      }))).toBe(true)
    })

    it('matches localhost_port with optional port', () => {
      expect(matchesUrlFilter('http://localhost:3000/app', createFilter({
        matchType: 'localhost_port',
        pattern: '3000',
      }))).toBe(true)

      expect(matchesUrlFilter('http://localhost:8080/app', createFilter({
        matchType: 'localhost_port',
        pattern: '',
      }))).toBe(true)

      expect(matchesUrlFilter('http://localhost:8080/app', createFilter({
        matchType: 'localhost_port',
        pattern: '3000',
      }))).toBe(false)
    })

    it('matches dnr_url_filter glob on url.href', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'dnr_url_filter',
        pattern: '*.example.com/*',
      }))).toBe(true)
    })

    it('matches regex on url.href', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'regex',
        pattern: '^https://api\\.example\\.com/.*$',
      }))).toBe(true)
    })

    it('returns false for invalid regex patterns', () => {
      expect(matchesUrlFilter(url, createFilter({
        matchType: 'regex',
        pattern: '[',
      }))).toBe(false)
    })
  })

  describe('isProfileEnabledForTabUrl', () => {
    const url = 'https://api.example.com/'

    it('enables when there are no include filters', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ type: 'exclude', matchType: 'host_equals', pattern: 'blocked.example.com' }),
        ],
      })
      expect(isProfileEnabledForTabUrl(profile, url)).toBe(true)
    })

    it('requires at least one include match when includes exist', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ type: 'include', matchType: 'host_equals', pattern: 'example.com' }),
        ],
      })
      expect(isProfileEnabledForTabUrl(profile, url)).toBe(false)
    })

    it('enables when an include matches', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ type: 'include', matchType: 'host_equals', pattern: 'api.example.com' }),
        ],
      })
      expect(isProfileEnabledForTabUrl(profile, url)).toBe(true)
    })

    it('exclude overrides include', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ type: 'include', matchType: 'host_ends_with', pattern: 'example.com' }),
          createFilter({ type: 'exclude', matchType: 'host_equals', pattern: 'api.example.com' }),
        ],
      })
      expect(isProfileEnabledForTabUrl(profile, url)).toBe(false)
    })

    it('ignores disabled filters', () => {
      const profile = createProfile({
        urlFilters: [
          createFilter({ type: 'include', enabled: false, matchType: 'host_equals', pattern: 'api.example.com' }),
        ],
      })
      expect(isProfileEnabledForTabUrl(profile, url)).toBe(true)
    })
  })
})
