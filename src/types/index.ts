export type HeaderType = 'request' | 'response'

/**
 * Counter for fallback ID generation to prevent collisions in the same millisecond
 */
let idCounter = 0

/**
 * Generates a unique ID with fallback for environments without crypto.randomUUID
 * @returns A unique identifier string
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto API - includes counter for collision resistance
  return `${Date.now()}-${++idCounter}-${Math.random().toString(36).substring(2, 11)}`
}

// ModHeader import types
export interface ModHeaderHeader {
  enabled: boolean
  name: string
  value: string
  appendMode?: boolean
  comment?: string
}

export interface ModHeaderProfile {
  headers: ModHeaderHeader[]
  respHeaders?: ModHeaderHeader[]
  hideComment?: boolean
  shortTitle?: string
  title: string
  version?: number
}

/**
 * Validates that an object has the structure of a ModHeader header
 */
function isValidModHeaderHeader(h: unknown): boolean {
  return (
    typeof h === 'object' &&
    h !== null &&
    'enabled' in h &&
    'name' in h &&
    'value' in h
  )
}

/**
 * Detects if the given data is a ModHeader export format
 * ModHeader exports an array of profiles directly, not wrapped in an object
 * Also validates the header structure to prevent runtime errors during conversion
 */
export function isModHeaderFormat(data: unknown): data is ModHeaderProfile[] {
  if (!Array.isArray(data) || data.length === 0) return false

  const first = data[0]
  if (typeof first !== 'object' || first === null) return false
  if (!('title' in first) || !('headers' in first)) return false
  if (!Array.isArray(first.headers)) return false

  // Validate header structure (check first few headers to avoid performance issues)
  const headersToCheck = first.headers.slice(0, 5)
  return headersToCheck.every(isValidModHeaderHeader)
}

/**
 * Converts a ModHeader header to OpenHeaders HeaderRule format
 * Returns null if the header is malformed
 */
function convertModHeaderHeader(h: ModHeaderHeader, type: HeaderType): HeaderRule | null {
  // Validate required fields
  if (typeof h.enabled !== 'boolean' || typeof h.name !== 'string') {
    return null
  }

  return {
    id: generateId(),
    enabled: h.enabled,
    name: h.name || '',
    value: typeof h.value === 'string' ? h.value : '',
    comment: typeof h.comment === 'string' ? h.comment : '',
    type,
    operation: h.appendMode ? 'append' : 'set',
  }
}

/**
 * Converts a ModHeader profile to OpenHeaders format
 * Skips malformed headers with a warning
 */
export function convertModHeaderProfile(
  modProfile: ModHeaderProfile,
  colorIndex: number
): Profile {
  const headers: HeaderRule[] = []

  // Convert request headers
  for (const h of modProfile.headers || []) {
    const converted = convertModHeaderHeader(h, 'request')
    if (converted) {
      headers.push(converted)
    }
  }

  // Convert response headers if present
  for (const h of modProfile.respHeaders || []) {
    const converted = convertModHeaderHeader(h, 'response')
    if (converted) {
      headers.push(converted)
    }
  }

  return {
    id: generateId(),
    name: modProfile.title || 'Imported Profile',
    color: DEFAULT_PROFILE_COLORS[colorIndex % DEFAULT_PROFILE_COLORS.length] ?? '#7c3aed',
    headers,
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
export type HeaderOperation = 'set' | 'remove' | 'append'
export type DarkModePreference = 'system' | 'light' | 'dark'
export type LanguagePreference = 'auto' | 'en' | 'sv'

export interface HeaderRule {
  id: string
  enabled: boolean
  name: string
  value: string
  comment: string
  type: HeaderType
  operation: HeaderOperation
}

export type UrlFilterMatchType =
  | 'host_equals'
  | 'host_ends_with'
  | 'localhost_port'
  | 'url_starts_with'
  | 'path_starts_with'
  | 'url_contains'
  | 'dnr_url_filter'
  | 'regex'

export interface UrlFilter {
  id: string
  enabled: boolean
  matchType: UrlFilterMatchType
  pattern: string
  type: 'include' | 'exclude'
}

export interface Profile {
  id: string
  name: string
  color: string
  headers: HeaderRule[]
  urlFilters: UrlFilter[]
  createdAt: number
  updatedAt: number
}

export interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  darkModePreference: DarkModePreference
  languagePreference: LanguagePreference
  headerSuggestions?: HeaderSuggestionsState
}

export interface HeaderSuggestionsState {
  names: string[]
  valuesByName: Record<string, string[]>
  hiddenNames?: string[]
}

export interface HistoryEntry {
  state: AppState
  timestamp: number
}

export const DEFAULT_PROFILE_COLORS = [
  '#7c3aed', // violet
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#db2777', // pink
  '#0891b2', // cyan
  '#4f46e5', // indigo
]

/**
 * Creates a new empty header rule with default values
 * @param type - The header type ('request' or 'response'), defaults to 'request'
 * @returns A new HeaderRule with a unique ID and default values
 */
export function createEmptyHeader(type: HeaderType = 'request'): HeaderRule {
  return {
    id: generateId(),
    enabled: true,
    name: '',
    value: '',
    comment: '',
    type,
    operation: 'set',
  }
}

/**
 * Creates a new empty profile with default values
 * @param name - The profile name, defaults to 'Profile 1'
 * @returns A new Profile with a unique ID, default color, and empty arrays
 */
export function createEmptyProfile(name = 'Profile 1'): Profile {
  return {
    id: generateId(),
    name,
    color: DEFAULT_PROFILE_COLORS[0] ?? '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
