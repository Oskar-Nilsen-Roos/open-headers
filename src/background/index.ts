import type { AppState, Profile } from '../types'
import { collectRegexFilters, isRegexSupported } from '../lib/urlFilters'
import { buildSessionRules, getEnabledHeaders } from '../lib/rules'
import { getReadableTextColor, parseColorInputToHex } from '../lib/color'

declare const process: { env?: { [key: string]: string | undefined } } | undefined

const STORAGE_KEY = 'openheaders_state'
const DEFAULT_PROFILE_COLOR = '#7c3aed'
const DEFAULT_ICON_PATHS: { [size: number]: string } = {
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
}
const PROFILE_ICON_SIZES = [16, 32, 48, 128]
const BADGE_BACKGROUND_COLOR = '#111827'
const BADGE_TEXT_COLOR = '#ffffff'
const INACTIVE_ICON_OPACITY = 0.52
const CAN_RENDER_CUSTOM_ICON = typeof OffscreenCanvas !== 'undefined'
const DEBUG =
  typeof process !== 'undefined' &&
  !!process.env &&
  process.env.OPENHEADERS_DEBUG === 'true'

function normalizeProfileColor(color: string | undefined): string {
  const parsed = parseColorInputToHex(color ?? '')
  if (parsed) return parsed
  return DEFAULT_PROFILE_COLOR
}

function getActiveProfileNumber(state: AppState | null): number {
  if (!state || !state.activeProfileId) return 1

  const index = state.profiles.findIndex(p => p.id === state.activeProfileId)
  if (index < 0) return 1
  return index + 1
}

function createProfileIconImageData(
  size: number,
  profileColor: string,
  textColor: string,
  profileNumber: number,
  iconOpacity: number
): ImageData | null {
  try {
    const canvas = new OffscreenCanvas(size, size)
    const context = canvas.getContext('2d')
    if (!context) return null

    const center = size / 2
    const radius = size * 0.42
    const effectiveOpacity = Math.max(0.15, Math.min(1, iconOpacity))

    context.clearRect(0, 0, size, size)
    context.globalAlpha = effectiveOpacity
    context.beginPath()
    context.arc(center, center, radius, 0, Math.PI * 2)
    context.fillStyle = profileColor
    context.fill()

    context.lineWidth = Math.max(1, size * 0.035)
    context.strokeStyle = textColor
    context.globalAlpha = effectiveOpacity * 0.26
    context.stroke()
    context.globalAlpha = effectiveOpacity

    const displayedNumber = String(Math.min(Math.max(profileNumber, 1), 99))
    const fontScale = displayedNumber.length > 1 ? 0.48 : 0.58
    context.fillStyle = textColor
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `700 ${Math.max(8, Math.floor(size * fontScale))}px "SF Pro Rounded", "Avenir Next Rounded", "Nunito Sans", "Trebuchet MS", "Segoe UI", sans-serif`
    context.fillText(displayedNumber, center, center + size * 0.02)
    context.globalAlpha = 1

    return context.getImageData(0, 0, size, size)
  } catch {
    return null
  }
}

function createProfileIconSet(
  profileColor: string,
  textColor: string,
  profileNumber: number,
  iconOpacity: number
): { [size: number]: ImageData } | null {
  const imageDataBySize: { [size: number]: ImageData } = {}

  for (const size of PROFILE_ICON_SIZES) {
    const imageData = createProfileIconImageData(
      size,
      profileColor,
      textColor,
      profileNumber,
      iconOpacity
    )
    if (!imageData) return null
    imageDataBySize[size] = imageData
  }

  return imageDataBySize
}

function getActiveProfile(state: AppState | null): Profile | null {
  if (!state) return null
  return state.profiles.find(p => p.id === state.activeProfileId) ?? null
}

function formatBadgeCount(count: number): string {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

let latestState: AppState | null = null
// Number of enabled headers that currently have at least one session rule delivering them.
let appliedHeaderCount = 0
const regexSupportCache = new Map<string, boolean>()
let clearDynamicRulesPromise: Promise<void> | null = null
let pendingUpdate = false
let updateInFlight: Promise<void> | null = null
let pendingActionUpdate = false
let actionUpdateInFlight: Promise<void> | null = null
let lastAppliedIconKey: string | null = null
let lastBadgeText: string | null = null
let badgeStyleInitialized = false

function clearDynamicRulesOnce(): Promise<void> {
  if (!clearDynamicRulesPromise) {
    clearDynamicRulesPromise = (async () => {
      try {
        const dynamic = await chrome.declarativeNetRequest.getDynamicRules()
        const ids = dynamic.map(r => r.id)
        if (ids.length > 0) {
          await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids })
        }
      } catch (error) {
        console.warn('Failed to clear dynamic rules (continuing):', error)
      }
    })()
  }
  return clearDynamicRulesPromise
}

async function setActionIcon(profile: Profile | null, profileNumber: number, iconOpacity: number): Promise<void> {
  if (!profile || !CAN_RENDER_CUSTOM_ICON) {
    if (lastAppliedIconKey === 'default') return
    await chrome.action.setIcon({ path: DEFAULT_ICON_PATHS })
    lastAppliedIconKey = 'default'
    return
  }

  const profileColor = normalizeProfileColor(profile.color)
  const textColor = getReadableTextColor(profileColor)
  const iconKey = `profile:${profileColor}:${textColor}:${profileNumber}:${iconOpacity.toFixed(2)}`
  if (lastAppliedIconKey === iconKey) return

  const iconSet = createProfileIconSet(profileColor, textColor, profileNumber, iconOpacity)
  if (!iconSet) {
    if (lastAppliedIconKey === 'default') return
    await chrome.action.setIcon({ path: DEFAULT_ICON_PATHS })
    lastAppliedIconKey = 'default'
    return
  }

  await chrome.action.setIcon({ imageData: iconSet })
  lastAppliedIconKey = iconKey
}

async function setActionBadgeText(text: string): Promise<void> {
  if (text && !badgeStyleInitialized) {
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_BACKGROUND_COLOR })
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR })
    }
    badgeStyleInitialized = true
  }

  if (lastBadgeText === text) return
  await chrome.action.setBadgeText({ text })
  lastBadgeText = text
}

async function updateActionAppearanceOnce(): Promise<void> {
  try {
    const profile = getActiveProfile(latestState)
    const profileNumber = getActiveProfileNumber(latestState)
    const iconOpacity = appliedHeaderCount > 0 ? 1 : INACTIVE_ICON_OPACITY

    await setActionIcon(profile, profileNumber, iconOpacity)
    await setActionBadgeText(formatBadgeCount(appliedHeaderCount))
  } catch (error) {
    console.error('Failed to update action appearance:', error)
  }
}

function queueUpdateActionAppearance(): void {
  pendingActionUpdate = true
  if (actionUpdateInFlight) return

  actionUpdateInFlight = (async () => {
    // Defer to the next event loop tick so multiple rapid calls can be batched.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    try {
      while (pendingActionUpdate) {
        pendingActionUpdate = false
        await updateActionAppearanceOnce()
      }
    } finally {
      actionUpdateInFlight = null
      if (pendingActionUpdate) queueUpdateActionAppearance()
    }
  })()
}

function queueUpdateRules(): void {
  pendingUpdate = true
  if (updateInFlight) return

  updateInFlight = (async () => {
    // Defer to the next event loop tick so multiple rapid calls can be batched.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    try {
      while (pendingUpdate) {
        pendingUpdate = false
        await updateRulesOnce()
      }
    } finally {
      updateInFlight = null
      if (pendingUpdate) queueUpdateRules()
    }
  })()
}

async function supportedRegexFilters(profile: Profile): Promise<Set<string>> {
  const supported = new Set<string>()
  await Promise.all(
    collectRegexFilters(profile).map(async regex => {
      let ok = regexSupportCache.get(regex)
      if (ok === undefined) {
        ok = await isRegexSupported(regex)
        regexSupportCache.set(regex, ok)
      }
      if (ok) supported.add(regex)
    })
  )
  return supported
}

async function updateRulesOnce(): Promise<void> {
  try {
    await clearDynamicRulesOnce()

    const profile = getActiveProfile(latestState)
    const supported = profile ? await supportedRegexFilters(profile) : new Set<string>()
    const rules = profile ? buildSessionRules(profile, regex => supported.has(regex)) : []

    const existing = await chrome.declarativeNetRequest.getSessionRules()
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: existing.map(rule => rule.id),
      addRules: rules,
    })

    appliedHeaderCount = profile && rules.length > 0 ? getEnabledHeaders(profile).length : 0

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('Session rules updated:', rules.length, 'rule(s)')
    }
  } catch (error) {
    console.error('Failed to update rules:', error)
  }

  queueUpdateActionAppearance()
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    latestState = changes[STORAGE_KEY].newValue as AppState
    queueUpdateRules()
  }
})

// Initialize on startup
async function initialize(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  latestState = result[STORAGE_KEY] as AppState | null
  queueUpdateRules()
}

initialize().catch((error) => console.error('Failed to initialize background script:', error))

// Message handler for popup communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_RULES') {
    Promise.all([
      chrome.declarativeNetRequest.getSessionRules(),
      chrome.declarativeNetRequest.getDynamicRules(),
    ]).then(([sessionRules, dynamicRules]) => {
      sendResponse({ sessionRules, dynamicRules })
    }).catch((error) => {
      sendResponse({ error: String(error) })
    })
    return true // Keep channel open for async response
  }
})
