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

export interface UrlFilter {
  id: string
  enabled: boolean
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
