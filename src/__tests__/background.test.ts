import { describe, it, expect } from 'vitest'
import type { AppState, Profile, HeaderRule } from '@/types'
import { isProfileEnabledForTabUrl } from '@/lib/urlFilters'

// We need to test the background script logic without Chrome APIs
// So we recreate and test the pure logic and rule shape

function headerOperationToChrome(operation: HeaderRule['operation']): string {
  switch (operation) {
    case 'set':
      return 'SET'
    case 'remove':
      return 'REMOVE'
    case 'append':
      return 'APPEND'
    default:
      return 'SET'
  }
}

interface ModifyHeaderInfo {
  header: string
  operation: string
  value?: string
}

interface RuleAction {
  type: 'modifyHeaders'
  requestHeaders?: ModifyHeaderInfo[]
  responseHeaders?: ModifyHeaderInfo[]
}

interface Rule {
  id: number
  priority: number
  action: RuleAction
  condition: {
    urlFilter: string
    resourceTypes: string[]
    tabIds: number[]
  }
}

type TabInfo = { id: number; url: string }

function computeEnabledTabIds(profile: Profile, tabs: TabInfo[]): number[] {
  const enabled: number[] = []
  for (const tab of tabs) {
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) continue
    if (isProfileEnabledForTabUrl(profile, tab.url)) {
      enabled.push(tab.id)
    }
  }
  return enabled
}

function buildRulesFromActiveProfile(state: AppState, tabs: TabInfo[]): Rule[] {
  const rules: Rule[] = []

  const profile = state.profiles.find((p) => p.id === state.activeProfileId)
  if (!profile) return rules

  const enabledHeaders = profile.headers.filter((h) => h.enabled && h.name.trim())
  if (enabledHeaders.length === 0) return rules

  const enabledTabIds = computeEnabledTabIds(profile, tabs)
  if (enabledTabIds.length === 0) return rules

  const requestHeaders: ModifyHeaderInfo[] = []
  const responseHeaders: ModifyHeaderInfo[] = []

  for (const header of enabledHeaders) {
    const headerInfo: ModifyHeaderInfo = {
      header: header.name,
      operation: headerOperationToChrome(header.operation),
      ...(header.operation !== 'remove' && header.value ? { value: header.value } : {}),
    }

    if (header.type === 'request') {
      requestHeaders.push(headerInfo)
    } else {
      responseHeaders.push(headerInfo)
    }
  }

  const action: RuleAction = {
    type: 'modifyHeaders',
    ...(requestHeaders.length > 0 ? { requestHeaders } : {}),
    ...(responseHeaders.length > 0 ? { responseHeaders } : {}),
  }

  rules.push({
    id: 1,
    priority: 1,
    action,
    condition: {
      urlFilter: '*',
      tabIds: enabledTabIds,
      resourceTypes: ['main_frame', 'xmlhttprequest'],
    },
  })

  return rules
}

function countAppliedHeadersForTab(state: AppState, tabUrl: string): number {
  const profile = state.profiles.find((p) => p.id === state.activeProfileId)
  if (!profile) return 0
  if (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://')) return 0
  if (!isProfileEnabledForTabUrl(profile, tabUrl)) return 0
  return profile.headers.filter((h) => h.enabled && h.name.trim()).length
}

describe('Background Script Logic', () => {
  const createHeader = (overrides: Partial<HeaderRule> = {}): HeaderRule => ({
    id: 'header-id',
    enabled: true,
    name: 'X-Test',
    value: 'test-value',
    comment: '',
    type: 'request',
    operation: 'set',
    ...overrides,
  })

  const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: 'profile-id',
    name: 'Test Profile',
    color: '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  const createState = (overrides: Partial<AppState> = {}): AppState => ({
    profiles: [createProfile()],
    activeProfileId: 'profile-id',
    darkModePreference: 'system',
    languagePreference: 'auto',
    ...overrides,
  })

  describe('headerOperationToChrome', () => {
    it('converts set operation', () => {
      expect(headerOperationToChrome('set')).toBe('SET')
    })

    it('converts remove operation', () => {
      expect(headerOperationToChrome('remove')).toBe('REMOVE')
    })

    it('converts append operation', () => {
      expect(headerOperationToChrome('append')).toBe('APPEND')
    })

    it('defaults to SET for unknown operation', () => {
      expect(headerOperationToChrome('unknown' as HeaderRule['operation'])).toBe('SET')
    })
  })

  describe('buildRulesFromActiveProfile', () => {
    it('returns empty array when no active profile', () => {
      const state = createState({ activeProfileId: null })
      const rules = buildRulesFromActiveProfile(state, [])
      expect(rules).toEqual([])
    })

    it('returns empty array when active profile not found', () => {
      const state = createState({ activeProfileId: 'non-existent' })
      const rules = buildRulesFromActiveProfile(state, [])
      expect(rules).toEqual([])
    })

    it('returns empty array when no enabled headers', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader({ enabled: false })] })],
      })
      const rules = buildRulesFromActiveProfile(state, [])
      expect(rules).toEqual([])
    })

    it('returns empty array when no tabs match filters', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: true, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://nope.com/' },
      ])

      expect(rules).toEqual([])
    })

    it('creates rule for enabled request header', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ type: 'request', name: 'Authorization', value: 'Bearer token' })],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://example.com/' },
      ])

      expect(rules.length).toBe(1)
      expect(rules[0]!.action.requestHeaders).toEqual([
        { header: 'Authorization', operation: 'SET', value: 'Bearer token' },
      ])
      expect(rules[0]!.action.responseHeaders).toBeUndefined()
      expect(rules[0]!.condition.tabIds).toEqual([1])
    })

    it('creates rule for enabled response header', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [
              createHeader({ type: 'response', name: 'X-Custom-Response', value: 'custom-value' }),
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://example.com/' },
      ])

      expect(rules.length).toBe(1)
      expect(rules[0]!.action.responseHeaders).toEqual([
        { header: 'X-Custom-Response', operation: 'SET', value: 'custom-value' },
      ])
      expect(rules[0]!.action.requestHeaders).toBeUndefined()
    })

    it('handles remove operation without value', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ operation: 'remove', name: 'X-Remove-Me', value: '' })],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://example.com/' },
      ])

      expect(rules[0]!.action.requestHeaders).toEqual([
        { header: 'X-Remove-Me', operation: 'REMOVE' },
      ])
    })

    it('applies to all known tabs when no include filters exist', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader()] })],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 10, url: 'https://a.com/' },
        { id: 11, url: 'https://b.com/' },
      ])

      expect(rules.length).toBe(1)
      expect(rules[0]!.condition.urlFilter).toBe('*')
      expect(rules[0]!.condition.tabIds.sort()).toEqual([10, 11])
    })

    it('limits to tabs matching include filters', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: true, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://example.com/' },
        { id: 2, url: 'https://other.com/' },
      ])

      expect(rules.length).toBe(1)
      expect(rules[0]!.condition.tabIds).toEqual([1])
    })

    it('excludes tabs matching exclude filters even if include matches', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'i1', enabled: true, type: 'include', matchType: 'host_ends_with', pattern: 'example.com' },
              { id: 'e1', enabled: true, type: 'exclude', matchType: 'host_equals', pattern: 'blocked.example.com' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state, [
        { id: 1, url: 'https://api.example.com/' },
        { id: 2, url: 'https://blocked.example.com/' },
      ])

      expect(rules.length).toBe(1)
      expect(rules[0]!.condition.tabIds).toEqual([1])
    })
  })

  describe('countAppliedHeadersForTab', () => {
    it('counts only enabled headers with non-empty names', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [
              createHeader({ enabled: true, name: 'X-Enabled-1' }),
              createHeader({ id: 'h2', enabled: true, name: 'X-Enabled-2' }),
              createHeader({ id: 'h3', enabled: false, name: 'X-Disabled' }),
              createHeader({ id: 'h4', enabled: true, name: '   ' }),
            ],
            urlFilters: [
              { id: 'f1', enabled: true, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
            ],
          }),
        ],
      })

      // URL filters only gate applicability; they are not counted as active items.
      expect(countAppliedHeadersForTab(state, 'https://example.com/')).toBe(2)
    })

    it('returns 0 when include filters do not match', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ name: 'X-Test' })],
            urlFilters: [
              { id: 'f1', enabled: true, type: 'include', matchType: 'host_equals', pattern: 'example.com' },
            ],
          }),
        ],
      })

      expect(countAppliedHeadersForTab(state, 'https://other.com/')).toBe(0)
    })

    it('returns 0 for non-http tabs', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ name: 'X-Test' })],
          }),
        ],
      })

      expect(countAppliedHeadersForTab(state, 'chrome://extensions')).toBe(0)
    })
  })
})
