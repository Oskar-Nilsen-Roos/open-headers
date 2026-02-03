import { describe, it, expect } from 'vitest'
import { doesUrlFilterMatch, isUrlAllowedByFilters } from '@/lib/urlFilters'
import type { UrlFilterLike } from '@/lib/urlFilters'

describe('urlFilters', () => {
  describe('doesUrlFilterMatch', () => {
    it('matches host_equals with plain hostname', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'host_equals',
        pattern: 'example.com',
      }

      expect(doesUrlFilterMatch('https://example.com/path', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://api.example.com/path', filter)).toBe(false)
    })

    it('matches host_equals when pattern is a full URL', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'host_equals',
        pattern: 'https://example.com/somewhere',
      }

      expect(doesUrlFilterMatch('https://example.com/elsewhere', filter)).toBe(true)
    })

    it('matches host_ends_with for subdomains', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'host_ends_with',
        pattern: 'example.com',
      }

      expect(doesUrlFilterMatch('https://example.com/', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://api.example.com/', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://badexample.com/', filter)).toBe(false)
    })

    it('matches url_starts_with against full URL when scheme is present', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'url_starts_with',
        pattern: 'https://example.com/app',
      }

      expect(doesUrlFilterMatch('https://example.com/app/1', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://example.com/other', filter)).toBe(false)
    })

    it('matches url_starts_with against host+path when scheme is not present', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'url_starts_with',
        pattern: 'example.com/app',
      }

      expect(doesUrlFilterMatch('https://example.com/app/1', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://example.com/other', filter)).toBe(false)
    })

    it('matches url_contains', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'url_contains',
        pattern: 'example.com/app',
      }

      expect(doesUrlFilterMatch('https://example.com/app/1', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://example.com/other', filter)).toBe(false)
    })

    it('matches regex against full URL', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'regex',
        pattern: '^https://example\\.com/.*$',
      }

      expect(doesUrlFilterMatch('https://example.com/app/1', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://api.example.com/app/1', filter)).toBe(false)
    })

    it('returns false for invalid regex pattern', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'regex',
        pattern: '(',
      }

      expect(doesUrlFilterMatch('https://example.com/', filter)).toBe(false)
    })

    it('matches legacy dnr_url_filter glob', () => {
      const filter: UrlFilterLike = {
        enabled: true,
        type: 'include',
        matchType: 'dnr_url_filter',
        pattern: '*.example.com/*',
      }

      expect(doesUrlFilterMatch('https://api.example.com/v1', filter)).toBe(true)
      expect(doesUrlFilterMatch('https://example.org/', filter)).toBe(false)
    })
  })

  describe('isUrlAllowedByFilters', () => {
    it('allows all URLs when there are no enabled include filters', () => {
      const filters: UrlFilterLike[] = [
        { enabled: false, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
      ]

      expect(isUrlAllowedByFilters('https://anything.com/', filters)).toBe(true)
    })

    it('allows when any enabled include matches', () => {
      const filters: UrlFilterLike[] = [
        { enabled: true, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
        { enabled: true, type: 'include', matchType: 'host_equals', pattern: 'other.com' },
      ]

      expect(isUrlAllowedByFilters('https://example.com/', filters)).toBe(true)
      expect(isUrlAllowedByFilters('https://nope.com/', filters)).toBe(false)
    })

    it('blocks when any enabled exclude matches (even if include matches)', () => {
      const filters: UrlFilterLike[] = [
        { enabled: true, type: 'include', matchType: 'host_ends_with', pattern: 'example.com' },
        { enabled: true, type: 'exclude', matchType: 'host_equals', pattern: 'blocked.example.com' },
      ]

      expect(isUrlAllowedByFilters('https://api.example.com/', filters)).toBe(true)
      expect(isUrlAllowedByFilters('https://blocked.example.com/', filters)).toBe(false)
    })
  })
})

