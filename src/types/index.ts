export type HeaderType = 'request' | 'response'
export type HeaderOperation = 'set' | 'remove' | 'append'
export type DarkModePreference = 'system' | 'light' | 'dark'

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
  | 'url_starts_with'
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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
    name,
    color: DEFAULT_PROFILE_COLORS[0] ?? '#7c3aed',
    headers: [],
    urlFilters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
