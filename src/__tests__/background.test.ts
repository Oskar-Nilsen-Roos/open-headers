import { describe, it, expect } from 'vitest'
import type { AppState, Profile, HeaderRule } from '@/types'

// We need to test the background script logic without Chrome APIs
// So we'll extract and test the pure functions

// Recreate the headerOperationToChrome function for testing
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
  }
}

// Recreate buildRulesFromActiveProfile for testing
function buildRulesFromActiveProfile(state: AppState): Rule[] {
  const rules: Rule[] = []
  let ruleId = 1

  const profile = state.profiles.find((p) => p.id === state.activeProfileId)

  if (!profile) {
    return rules
  }

  const enabledHeaders = profile.headers.filter((h) => h.enabled && h.name.trim())
  if (enabledHeaders.length === 0) {
    return rules
  }

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

  if (requestHeaders.length > 0 || responseHeaders.length > 0) {
    const action: RuleAction = {
      type: 'modifyHeaders',
    }

    if (requestHeaders.length > 0) {
      action.requestHeaders = requestHeaders
    }
    if (responseHeaders.length > 0) {
      action.responseHeaders = responseHeaders
    }

    const includeFilters = profile.urlFilters.filter(
      (f) => f.enabled && f.type === 'include' && f.pattern.trim()
    )

    if (includeFilters.length > 0) {
      for (const filter of includeFilters) {
        rules.push({
          id: ruleId++,
          priority: 1,
          action,
          condition: {
            urlFilter: filter.pattern,
            resourceTypes: ['main_frame', 'xmlhttprequest'],
          },
        })
      }
    } else {
      rules.push({
        id: ruleId++,
        priority: 1,
        action,
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame', 'xmlhttprequest'],
        },
      })
    }
  }

  return rules
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
      const rules = buildRulesFromActiveProfile(state)
      expect(rules).toEqual([])
    })

    it('returns empty array when active profile not found', () => {
      const state = createState({ activeProfileId: 'non-existent' })
      const rules = buildRulesFromActiveProfile(state)
      expect(rules).toEqual([])
    })

    it('returns empty array when no enabled headers', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader({ enabled: false })] })],
      })
      const rules = buildRulesFromActiveProfile(state)
      expect(rules).toEqual([])
    })

    it('returns empty array when headers have no name', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader({ name: '' })] })],
      })
      const rules = buildRulesFromActiveProfile(state)
      expect(rules).toEqual([])
    })

    it('returns empty array when headers have whitespace-only name', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader({ name: '   ' })] })],
      })
      const rules = buildRulesFromActiveProfile(state)
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

      const rules = buildRulesFromActiveProfile(state)

      expect(rules.length).toBe(1)
      expect(rules[0]!.action.requestHeaders).toEqual([
        { header: 'Authorization', operation: 'SET', value: 'Bearer token' },
      ])
      expect(rules[0]!.action.responseHeaders).toBeUndefined()
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

      const rules = buildRulesFromActiveProfile(state)

      expect(rules.length).toBe(1)
      expect(rules[0]!.action.responseHeaders).toEqual([
        { header: 'X-Custom-Response', operation: 'SET', value: 'custom-value' },
      ])
      expect(rules[0]!.action.requestHeaders).toBeUndefined()
    })

    it('creates rule with both request and response headers', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [
              createHeader({ type: 'request', name: 'X-Request', value: 'req-value' }),
              createHeader({ id: 'h2', type: 'response', name: 'X-Response', value: 'res-value' }),
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules.length).toBe(1)
      expect(rules[0]!.action.requestHeaders?.length).toBe(1)
      expect(rules[0]!.action.responseHeaders?.length).toBe(1)
    })

    it('handles remove operation without value', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ operation: 'remove', name: 'X-Remove-Me', value: '' })],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.action.requestHeaders).toEqual([
        { header: 'X-Remove-Me', operation: 'REMOVE' },
      ])
    })

    it('handles append operation', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader({ operation: 'append', name: 'Cookie', value: 'session=abc' })],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.action.requestHeaders).toEqual([
        { header: 'Cookie', operation: 'APPEND', value: 'session=abc' },
      ])
    })

    it('applies to all URLs when no include filters', () => {
      const state = createState({
        profiles: [createProfile({ headers: [createHeader()] })],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.condition.urlFilter).toBe('*')
    })

    it('creates separate rules for each include filter', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: true, pattern: '*.example.com/*', type: 'include' },
              { id: 'f2', enabled: true, pattern: '*.test.com/*', type: 'include' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules.length).toBe(2)
      expect(rules[0]!.condition.urlFilter).toBe('*.example.com/*')
      expect(rules[1]!.condition.urlFilter).toBe('*.test.com/*')
    })

    it('ignores disabled include filters', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: false, pattern: '*.example.com/*', type: 'include' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.condition.urlFilter).toBe('*')
    })

    it('ignores empty pattern include filters', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [{ id: 'f1', enabled: true, pattern: '', type: 'include' }],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.condition.urlFilter).toBe('*')
    })

    it('ignores exclude filters (only processes includes)', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [{ id: 'f1', enabled: true, pattern: '*.blocked.com/*', type: 'exclude' }],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      // Should still apply to all URLs since exclude is not processed for URL filtering
      expect(rules[0]!.condition.urlFilter).toBe('*')
    })

    it('assigns incrementing rule IDs', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: true, pattern: 'a.com', type: 'include' },
              { id: 'f2', enabled: true, pattern: 'b.com', type: 'include' },
              { id: 'f3', enabled: true, pattern: 'c.com', type: 'include' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.id).toBe(1)
      expect(rules[1]!.id).toBe(2)
      expect(rules[2]!.id).toBe(3)
    })

    it('sets priority to 1 for all rules', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [createHeader()],
            urlFilters: [
              { id: 'f1', enabled: true, pattern: 'a.com', type: 'include' },
              { id: 'f2', enabled: true, pattern: 'b.com', type: 'include' },
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.priority).toBe(1)
      expect(rules[1]!.priority).toBe(1)
    })

    it('only includes enabled headers in rules', () => {
      const state = createState({
        profiles: [
          createProfile({
            headers: [
              createHeader({ id: 'h1', name: 'X-Enabled', enabled: true }),
              createHeader({ id: 'h2', name: 'X-Disabled', enabled: false }),
              createHeader({ id: 'h3', name: 'X-Also-Enabled', enabled: true }),
            ],
          }),
        ],
      })

      const rules = buildRulesFromActiveProfile(state)

      expect(rules[0]!.action.requestHeaders?.length).toBe(2)
      expect(rules[0]!.action.requestHeaders?.map((h) => h.header)).toEqual([
        'X-Enabled',
        'X-Also-Enabled',
      ])
    })
  })
})
