import { describe, expect, it } from 'vitest'
import type { AppState, HeaderRule, Profile } from '@/types'
import {
  countAppliedHeadersForUrl,
  countEnabledHeaders,
  createBadgeState,
  getActiveProfileDescriptor,
  getBadgeText,
} from '@/background/actionAppearance'

function createHeader(overrides: Partial<HeaderRule> = {}): HeaderRule {
  return {
    id: 'header-id',
    enabled: true,
    name: 'X-Test',
    value: 'value',
    comment: '',
    type: 'request',
    operation: 'set',
    ...overrides,
  }
}

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-id',
    name: 'Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    profiles: [createProfile()],
    activeProfileId: 'profile-id',
    darkModePreference: 'system',
    languagePreference: 'auto',
    ...overrides,
  }
}

describe('action appearance helpers', () => {
  describe('getActiveProfileDescriptor', () => {
    it('returns active profile and index', () => {
      const first = createProfile({ id: 'first' })
      const second = createProfile({ id: 'second' })
      const state = createState({
        profiles: [first, second],
        activeProfileId: 'second',
      })

      const result = getActiveProfileDescriptor(state)

      expect(result.profile?.id).toBe('second')
      expect(result.profileIndex).toBe(1)
    })

    it('returns null profile when active profile id is missing', () => {
      const state = createState({ activeProfileId: null })

      expect(getActiveProfileDescriptor(state)).toEqual({
        profile: null,
        profileIndex: -1,
      })
    })
  })

  describe('countEnabledHeaders', () => {
    it('counts only enabled headers with names', () => {
      const profile = createProfile({
        headers: [
          createHeader({ enabled: true, name: 'X-Enabled' }),
          createHeader({ enabled: false, name: 'X-Disabled' }),
          createHeader({ enabled: true, name: '    ' }),
        ],
      })

      expect(countEnabledHeaders(profile)).toBe(1)
    })
  })

  describe('countAppliedHeadersForUrl', () => {
    it('returns enabled count when url is matched', () => {
      const profile = createProfile({
        headers: [
          createHeader({ enabled: true, name: 'X-One' }),
          createHeader({ enabled: true, name: 'X-Two' }),
        ],
      })

      expect(countAppliedHeadersForUrl(profile, 'https://example.com/path')).toBe(2)
    })

    it('returns zero for non-http urls', () => {
      const profile = createProfile({
        headers: [createHeader({ enabled: true, name: 'X-One' })],
      })

      expect(countAppliedHeadersForUrl(profile, 'chrome://extensions/')).toBe(0)
    })

    it('returns zero when url filters exclude the tab', () => {
      const profile = createProfile({
        headers: [createHeader({ enabled: true, name: 'X-One' })],
        urlFilters: [
          {
            id: 'include',
            enabled: true,
            type: 'include',
            matchType: 'host_equals',
            pattern: 'example.com',
          },
          {
            id: 'exclude',
            enabled: true,
            type: 'exclude',
            matchType: 'host_equals',
            pattern: 'blocked.example.com',
          },
        ],
      })

      expect(countAppliedHeadersForUrl(profile, 'https://blocked.example.com')).toBe(0)
    })

    it('does not include enabled filters in the count', () => {
      const profile = createProfile({
        headers: [createHeader({ enabled: true, name: 'X-One' })],
        urlFilters: [
          {
            id: 'include-host',
            enabled: true,
            type: 'include',
            matchType: 'host_equals',
            pattern: 'example.com',
          },
          {
            id: 'include-path',
            enabled: true,
            type: 'include',
            matchType: 'path_starts_with',
            pattern: '/api',
          },
          {
            id: 'exclude-other',
            enabled: true,
            type: 'exclude',
            matchType: 'host_equals',
            pattern: 'blocked.example.com',
          },
        ],
      })

      expect(countAppliedHeadersForUrl(profile, 'https://example.com/api/users')).toBe(1)
    })
  })

  describe('getBadgeText', () => {
    it('uses empty string for zero', () => {
      expect(getBadgeText(0)).toBe('')
    })

    it('caps large counts', () => {
      expect(getBadgeText(140)).toBe('99+')
    })
  })

  describe('createBadgeState', () => {
    it('returns non-empty badge for applied headers', () => {
      const profile = createProfile({
        color: '#ff0000',
        headers: [
          createHeader({ enabled: true, name: 'X-One' }),
          createHeader({ enabled: true, name: 'X-Two' }),
        ],
      })

      const state = createBadgeState(profile, 'https://example.com')

      expect(state.count).toBe(2)
      expect(state.text).toBe('2')
      expect(state.backgroundColor).toBe('#ff0000')
      expect(state.textColor.startsWith('#')).toBe(true)
    })

    it('returns empty badge when profile does not apply to tab', () => {
      const profile = createProfile({
        headers: [createHeader({ enabled: true, name: 'X-One' })],
        urlFilters: [
          {
            id: 'include',
            enabled: true,
            type: 'include',
            matchType: 'host_equals',
            pattern: 'example.com',
          },
        ],
      })

      const state = createBadgeState(profile, 'https://other.com')

      expect(state.count).toBe(0)
      expect(state.text).toBe('')
    })
  })
})
