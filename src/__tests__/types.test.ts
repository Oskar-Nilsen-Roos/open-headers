import { describe, it, expect } from 'vitest'
import {
  createEmptyHeader,
  createEmptyProfile,
  DEFAULT_PROFILE_COLORS,
} from '../types'

describe('createEmptyHeader', () => {
  it('creates a header with default request type', () => {
    const header = createEmptyHeader()

    expect(header.type).toBe('request')
    expect(header.enabled).toBe(true)
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
