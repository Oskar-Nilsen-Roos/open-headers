import { describe, it, expect } from 'vitest'
import {
  createEmptyHeader,
  createEmptyProfile,
  DEFAULT_PROFILE_COLORS,
  isModHeaderFormat,
  convertModHeaderProfile,
  generateId,
} from '../types'
import type { ModHeaderProfile } from '../types'

describe('createEmptyHeader', () => {
  it('creates a header with default request type', () => {
    const header = createEmptyHeader()

    expect(header.type).toBe('request')
    expect(header.enabled).toBe(false)
    expect(header.name).toBe('')
    expect(header.value).toBe('')
    expect(header.comment).toBe('')
    expect(header.operation).toBe('set')
    expect(header.id).toBeDefined()
    expect(typeof header.id).toBe('string')
  })

  it('creates a response header when specified', () => {
    const header = createEmptyHeader('response')

    expect(header.type).toBe('response')
  })

  it('generates unique IDs for each header', () => {
    const header1 = createEmptyHeader()
    const header2 = createEmptyHeader()

    expect(header1.id).not.toBe(header2.id)
  })
})

describe('createEmptyProfile', () => {
  it('creates a profile with default name', () => {
    const profile = createEmptyProfile()

    expect(profile.name).toBe('Profile 1')
    expect(profile.headers).toEqual([])
    expect(profile.urlFilters).toEqual([])
    expect(profile.color).toBe(DEFAULT_PROFILE_COLORS[0])
    expect(profile.id).toBeDefined()
    expect(profile.createdAt).toBeDefined()
    expect(profile.updatedAt).toBeDefined()
  })

  it('creates a profile with custom name', () => {
    const profile = createEmptyProfile('My Custom Profile')

    expect(profile.name).toBe('My Custom Profile')
  })

  it('generates unique IDs for each profile', () => {
    const profile1 = createEmptyProfile('Profile 1')
    const profile2 = createEmptyProfile('Profile 2')

    expect(profile1.id).not.toBe(profile2.id)
  })

  it('sets createdAt and updatedAt to current timestamp', () => {
    const before = Date.now()
    const profile = createEmptyProfile()
    const after = Date.now()

    expect(profile.createdAt).toBeGreaterThanOrEqual(before)
    expect(profile.createdAt).toBeLessThanOrEqual(after)
    expect(profile.updatedAt).toBeGreaterThanOrEqual(before)
    expect(profile.updatedAt).toBeLessThanOrEqual(after)
  })
})

describe('DEFAULT_PROFILE_COLORS', () => {
  it('contains multiple colors', () => {
    expect(DEFAULT_PROFILE_COLORS.length).toBeGreaterThan(0)
  })

  it('contains valid hex colors', () => {
    DEFAULT_PROFILE_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })
})

describe('isModHeaderFormat', () => {
  it('returns true for valid ModHeader format', () => {
    const data = [
      {
        title: 'Profile 1',
        headers: [{ enabled: true, name: 'X-Test', value: 'test' }],
      },
    ]
    expect(isModHeaderFormat(data)).toBe(true)
  })

  it('returns true for ModHeader format with empty headers', () => {
    const data = [{ title: 'Profile 1', headers: [] }]
    expect(isModHeaderFormat(data)).toBe(true)
  })

  it('returns false for OpenHeaders format', () => {
    const data = {
      version: 1,
      profiles: [{ id: '123', name: 'Profile 1', headers: [] }],
    }
    expect(isModHeaderFormat(data)).toBe(false)
  })

  it('returns false for non-array data', () => {
    expect(isModHeaderFormat({ title: 'test', headers: [] })).toBe(false)
    expect(isModHeaderFormat('string')).toBe(false)
    expect(isModHeaderFormat(null)).toBe(false)
    expect(isModHeaderFormat(undefined)).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(isModHeaderFormat([])).toBe(false)
  })

  it('returns false for array without required fields', () => {
    expect(isModHeaderFormat([{ name: 'test' }])).toBe(false)
    expect(isModHeaderFormat([{ title: 'test' }])).toBe(false)
    expect(isModHeaderFormat([{ headers: [] }])).toBe(false)
  })
})

describe('convertModHeaderProfile', () => {
  it('converts basic ModHeader profile to OpenHeaders format', () => {
    const modProfile: ModHeaderProfile = {
      title: 'Test Profile',
      headers: [
        { enabled: true, name: 'X-Header', value: 'value' },
      ],
    }

    const result = convertModHeaderProfile(modProfile, 0)

    expect(result.name).toBe('Test Profile')
    expect(result.id).toBeDefined()
    expect(result.color).toBe(DEFAULT_PROFILE_COLORS[0])
    expect(result.headers.length).toBe(1)
    expect(result.headers[0]?.name).toBe('X-Header')
    expect(result.headers[0]?.value).toBe('value')
    expect(result.headers[0]?.enabled).toBe(true)
    expect(result.headers[0]?.type).toBe('request')
    expect(result.headers[0]?.operation).toBe('set')
  })

  it('converts appendMode to append operation', () => {
    const modProfile: ModHeaderProfile = {
      title: 'Test',
      headers: [
        { enabled: true, name: 'X-Append', value: 'val', appendMode: true },
      ],
    }

    const result = convertModHeaderProfile(modProfile, 0)

    expect(result.headers[0]?.operation).toBe('append')
  })

  it('converts response headers correctly', () => {
    const modProfile: ModHeaderProfile = {
      title: 'Test',
      headers: [{ enabled: true, name: 'X-Request', value: 'req' }],
      respHeaders: [{ enabled: true, name: 'X-Response', value: 'resp' }],
    }

    const result = convertModHeaderProfile(modProfile, 0)

    expect(result.headers.length).toBe(2)
    expect(result.headers[0]?.type).toBe('request')
    expect(result.headers[1]?.type).toBe('response')
    expect(result.headers[1]?.name).toBe('X-Response')
  })

  it('assigns color based on colorIndex', () => {
    const modProfile: ModHeaderProfile = { title: 'Test', headers: [] }

    const result0 = convertModHeaderProfile(modProfile, 0)
    const result1 = convertModHeaderProfile(modProfile, 1)
    const result2 = convertModHeaderProfile(modProfile, 2)

    expect(result0.color).toBe(DEFAULT_PROFILE_COLORS[0])
    expect(result1.color).toBe(DEFAULT_PROFILE_COLORS[1])
    expect(result2.color).toBe(DEFAULT_PROFILE_COLORS[2])
  })

  it('cycles colors when colorIndex exceeds array length', () => {
    const modProfile: ModHeaderProfile = { title: 'Test', headers: [] }
    const colorsLength = DEFAULT_PROFILE_COLORS.length

    const result = convertModHeaderProfile(modProfile, colorsLength)

    expect(result.color).toBe(DEFAULT_PROFILE_COLORS[0])
  })

  it('handles missing or empty values gracefully', () => {
    const modProfile: ModHeaderProfile = {
      title: '',
      headers: [{ enabled: false, name: '', value: '' }],
    }

    const result = convertModHeaderProfile(modProfile, 0)

    expect(result.name).toBe('Imported Profile')
    expect(result.headers[0]?.name).toBe('')
    expect(result.headers[0]?.value).toBe('')
    expect(result.headers[0]?.comment).toBe('')
  })

  it('preserves comment if provided', () => {
    const modProfile: ModHeaderProfile = {
      title: 'Test',
      headers: [{ enabled: true, name: 'X-Test', value: 'val', comment: 'My comment' }],
    }

    const result = convertModHeaderProfile(modProfile, 0)

    expect(result.headers[0]?.comment).toBe('My comment')
  })

  it('sets timestamps to current time', () => {
    const before = Date.now()
    const modProfile: ModHeaderProfile = { title: 'Test', headers: [] }

    const result = convertModHeaderProfile(modProfile, 0)

    const after = Date.now()
    expect(result.createdAt).toBeGreaterThanOrEqual(before)
    expect(result.createdAt).toBeLessThanOrEqual(after)
    expect(result.updatedAt).toBeGreaterThanOrEqual(before)
    expect(result.updatedAt).toBeLessThanOrEqual(after)
  })
})

describe('generateId', () => {
  it('generates a string ID', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })
})
