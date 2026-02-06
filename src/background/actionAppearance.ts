import type { AppState, Profile } from '../types'
import { getReadableTextColor, parseColorInputToHex } from '../lib/color'
import { isProfileEnabledForTabUrl } from '../lib/urlFilters'

const DEFAULT_PROFILE_COLOR = '#7c3aed'

export const DEFAULT_ACTION_ICON_PATHS = {
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
} as const

export interface ActiveProfileDescriptor {
  profile: Profile | null
  profileIndex: number
}

export interface ActionColorPalette {
  backgroundColor: string
  textColor: string
}

export interface BadgeState extends ActionColorPalette {
  count: number
  text: string
}

export function getActiveProfileDescriptor(state: AppState | null): ActiveProfileDescriptor {
  if (!state?.activeProfileId) {
    return {
      profile: null,
      profileIndex: -1,
    }
  }

  const profileIndex = state.profiles.findIndex(profile => profile.id === state.activeProfileId)
  const profile = profileIndex >= 0 ? (state.profiles[profileIndex] ?? null) : null

  return {
    profile,
    profileIndex,
  }
}

export function countEnabledHeaders(profile: Profile): number {
  // Badge count intentionally tracks enabled header rules only (never URL filters).
  return profile.headers.filter(header => header.enabled && header.name.trim()).length
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

export function countAppliedHeadersForUrl(profile: Profile | null, url: string | undefined): number {
  if (!profile) return 0
  if (!url || !isHttpUrl(url)) return 0
  if (!isProfileEnabledForTabUrl(profile, url)) return 0

  return countEnabledHeaders(profile)
}

export function getBadgeText(count: number): string {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

export function getProfileActionColors(profile: Profile | null): ActionColorPalette {
  const backgroundColor = parseColorInputToHex(profile?.color ?? '') ?? DEFAULT_PROFILE_COLOR
  return {
    backgroundColor,
    textColor: getReadableTextColor(backgroundColor),
  }
}

export function createBadgeState(profile: Profile | null, url: string | undefined): BadgeState {
  const count = countAppliedHeadersForUrl(profile, url)
  return {
    count,
    text: getBadgeText(count),
    ...getProfileActionColors(profile),
  }
}

export function getProfileActionLabel(profileIndex: number): string {
  if (profileIndex < 0) return '1'
  return String(profileIndex + 1)
}
