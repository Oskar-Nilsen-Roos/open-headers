import { describe, expect, it } from 'vitest'
import type { HeaderRule, Profile, UrlFilter } from '@/types'
import { buildSessionRules, getEnabledHeaders, headerOperationToChrome, RESOURCE_TYPES } from '@/lib/rules'

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

const createFilter = (overrides: Partial<UrlFilter> = {}): UrlFilter => ({
  id: 'filter-id',
  enabled: true,
  type: 'include',
  matchType: 'host_ends_with',
  pattern: 'example.com',
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

describe('session rules', () => {
  describe('headerOperationToChrome', () => {
    it('converts operations to the Chrome enum values', () => {
      expect(headerOperationToChrome('set')).toBe('set')
      expect(headerOperationToChrome('remove')).toBe('remove')
      expect(headerOperationToChrome('append')).toBe('append')
    })

    it('defaults to set for an unknown operation', () => {
      expect(headerOperationToChrome('unknown' as HeaderRule['operation'])).toBe('set')
    })
  })

  describe('getEnabledHeaders', () => {
    it('keeps only enabled headers with a name and, unless removing, a value', () => {
      const profile = createProfile({
        headers: [
          createHeader({ id: 'a', name: 'X-Enabled' }),
          createHeader({ id: 'b', enabled: false, name: 'X-Disabled' }),
          createHeader({ id: 'c', name: '   ' }),
          createHeader({ id: 'd', name: 'X-No-Value', value: '' }),
          createHeader({ id: 'e', name: 'X-Remove', value: '', operation: 'remove' }),
        ],
      })
      expect(getEnabledHeaders(profile).map(h => h.name)).toEqual(['X-Enabled', 'X-Remove'])
    })
  })

  describe('buildSessionRules', () => {
    it('returns no rules without enabled headers', () => {
      expect(buildSessionRules(createProfile())).toEqual([])
      expect(buildSessionRules(createProfile({ headers: [createHeader({ enabled: false })] }))).toEqual([])
    })

    it('applies to all requests, regardless of tab, when there are no filters', () => {
      const rules = buildSessionRules(createProfile({ headers: [createHeader()] }))

      expect(rules).toHaveLength(1)
      expect(rules[0]!.priority).toBe(1)
      expect(rules[0]!.condition.urlFilter).toBe('*')
      expect(rules[0]!.condition.resourceTypes).toEqual(RESOURCE_TYPES)
      expect(rules[0]!.condition.isUrlFilterCaseSensitive).toBe(true)
      expect(rules[0]!.condition).not.toHaveProperty('tabIds')
    })

    it('builds request and response header actions', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [
            createHeader({ id: 'a', name: 'X-Req', value: 'r' }),
            createHeader({ id: 'b', name: 'X-Resp', value: 's', type: 'response', operation: 'append' }),
            createHeader({ id: 'c', name: 'X-Gone', value: '', operation: 'remove' }),
          ],
        })
      )

      expect(rules[0]!.action).toEqual({
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'X-Req', operation: 'set', value: 'r' },
          { header: 'X-Gone', operation: 'remove' },
        ],
        responseHeaders: [{ header: 'X-Resp', operation: 'append', value: 's' }],
      })
    })

    it('omits response headers when there are none', () => {
      const rules = buildSessionRules(createProfile({ headers: [createHeader()] }))
      expect(rules[0]!.action.responseHeaders).toBeUndefined()
    })

    it('skips set/append headers with empty values without dropping the others', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [
            createHeader({ id: 'a', name: 'X-Empty', value: '' }),
            createHeader({ id: 'b', name: 'X-Valid', value: 'ok' }),
          ],
        })
      )
      expect(rules[0]!.action.requestHeaders).toEqual([{ header: 'X-Valid', operation: 'set', value: 'ok' }])
    })

    it('returns no rules when every header lacks a value', () => {
      const rules = buildSessionRules(createProfile({ headers: [createHeader({ value: '' })] }))
      expect(rules).toEqual([])
    })

    it('creates one rule per include filter, all with the same action', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [
            createFilter({ id: 'a', pattern: 'a.com' }),
            createFilter({ id: 'b', pattern: 'b.com' }),
          ],
        })
      )

      expect(rules.map(r => r.condition.requestDomains)).toEqual([['a.com'], ['b.com']])
      expect(rules.map(r => r.id)).toEqual([1, 2])
      expect(rules[0]!.action).toEqual(rules[1]!.action)
      expect(rules.every(r => r.condition.urlFilter === undefined)).toBe(true)
    })

    it('adds a higher-priority allow rule per exclude filter', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [
            createFilter({ id: 'i', pattern: 'example.com' }),
            createFilter({ id: 'e', type: 'exclude', matchType: 'host_equals', pattern: 'blocked.example.com' }),
          ],
        })
      )

      const allow = rules.filter(r => r.action.type === 'allow')
      const modify = rules.filter(r => r.action.type === 'modifyHeaders')
      expect(allow).toHaveLength(1)
      expect(modify).toHaveLength(1)
      expect(allow[0]!.priority).toBeGreaterThan(modify[0]!.priority!)
      expect(allow[0]!.condition.regexFilter).toContain('blocked\\.example\\.com')
      expect(new Set(rules.map(r => r.id)).size).toBe(rules.length)
    })

    it('excludes without includes apply to everything else', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [createFilter({ type: 'exclude', pattern: 'ads.test' })],
        })
      )

      expect(rules.map(r => r.action.type)).toEqual(['allow', 'modifyHeaders'])
      expect(rules[1]!.condition.urlFilter).toBe('*')
    })

    it('ignores disabled and blank filters', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [
            createFilter({ id: 'a', enabled: false }),
            createFilter({ id: 'b', pattern: '' }),
          ],
        })
      )
      expect(rules).toHaveLength(1)
      expect(rules[0]!.condition.urlFilter).toBe('*')
    })

    it('sends nothing when include filters exist but none is usable', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [createFilter({ matchType: 'localhost_port', pattern: 'example.com' })],
        })
      )
      expect(rules).toEqual([])
    })

    it('sends nothing when an exclude regex is unsupported by Chrome', () => {
      const rules = buildSessionRules(
        createProfile({
          headers: [createHeader()],
          urlFilters: [createFilter({ type: 'exclude', matchType: 'regex', pattern: '(?=x)' })],
        }),
        () => false
      )
      expect(rules).toEqual([])
    })
  })
})
