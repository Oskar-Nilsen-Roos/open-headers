import type { HeaderRule, AppState, Profile } from '../types'
import { isProfileEnabledForTabUrl } from '../lib/urlFilters'

declare const process: { env?: { [key: string]: string | undefined } } | undefined

const STORAGE_KEY = 'openheaders_state'
const SESSION_RULE_ID = 1
const DEFAULT_PROFILE_COLOR = '#7c3aed'
const DEFAULT_ICON_PATHS: { [size: number]: string } = {
  16: 'icons/icon16.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png',
}
const PROFILE_ICON_SIZES = [16, 32, 48, 128]
const BADGE_BACKGROUND_COLOR = '#111827'
const BADGE_TEXT_COLOR = '#ffffff'
const CAN_RENDER_CUSTOM_ICON = typeof OffscreenCanvas !== 'undefined'
const DEBUG =
  typeof process !== 'undefined' &&
  !!process.env &&
  process.env.OPENHEADERS_DEBUG === 'true'

interface RuleAction {
  type: 'modifyHeaders'
  requestHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]
  responseHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]
}

const RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
] satisfies Array<`${chrome.declarativeNetRequest.ResourceType}`>

function headerOperationToChrome(operation: HeaderRule['operation']): chrome.declarativeNetRequest.HeaderOperation {
  switch (operation) {
    case 'set':
      return chrome.declarativeNetRequest.HeaderOperation.SET
    case 'remove':
      return chrome.declarativeNetRequest.HeaderOperation.REMOVE
    case 'append':
      return chrome.declarativeNetRequest.HeaderOperation.APPEND
    default:
      return chrome.declarativeNetRequest.HeaderOperation.SET
  }
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function normalizeProfileColor(color: string | undefined): string {
  if (!color) return DEFAULT_PROFILE_COLOR

  const trimmed = color.trim()
  if (/^#[\da-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  if (/^#[\da-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1).split('')
    if (r && g && b) return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  return DEFAULT_PROFILE_COLOR
}

function getActiveProfileNumber(state: AppState | null): number {
  if (!state || !state.activeProfileId) return 1

  const index = state.profiles.findIndex(p => p.id === state.activeProfileId)
  if (index < 0) return 1
  return index + 1
}

function createProfileIconImageData(size: number, profileColor: string, profileNumber: number): ImageData | null {
  try {
    const canvas = new OffscreenCanvas(size, size)
    const context = canvas.getContext('2d')
    if (!context) return null

    const center = size / 2
    const radius = size * 0.42

    context.clearRect(0, 0, size, size)
    context.beginPath()
    context.arc(center, center, radius, 0, Math.PI * 2)
    context.fillStyle = profileColor
    context.fill()

    context.lineWidth = Math.max(1, size * 0.035)
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    context.stroke()

    const displayedNumber = String(Math.min(Math.max(profileNumber, 1), 99))
    const fontScale = displayedNumber.length > 1 ? 0.48 : 0.58
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `700 ${Math.max(8, Math.floor(size * fontScale))}px "Segoe UI", sans-serif`
    context.fillText(displayedNumber, center, center + size * 0.02)

    return context.getImageData(0, 0, size, size)
  } catch {
    return null
  }
}

function createProfileIconSet(profileColor: string, profileNumber: number): { [size: number]: ImageData } | null {
  const imageDataBySize: { [size: number]: ImageData } = {}

  for (const size of PROFILE_ICON_SIZES) {
    const imageData = createProfileIconImageData(size, profileColor, profileNumber)
    if (!imageData) return null
    imageDataBySize[size] = imageData
  }

  return imageDataBySize
}

function getActiveProfile(state: AppState | null): Profile | null {
  if (!state) return null
  return state.profiles.find(p => p.id === state.activeProfileId) ?? null
}

function getEnabledHeaderCount(profile: Profile): number {
  return profile.headers.filter(h => h.enabled && h.name.trim()).length
}

function getAppliedHeaderCountForUrl(profile: Profile, tabUrl: string | undefined): number {
  if (!tabUrl || !isHttpUrl(tabUrl)) return 0
  if (!isProfileEnabledForTabUrl(profile, tabUrl)) return 0
  return getEnabledHeaderCount(profile)
}

function formatBadgeCount(count: number): string {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

/**
 * Builds a Chrome declarativeNetRequest session rule from the active profile
 * @param profile - The active profile
 * @param enabledTabIds - The tab IDs where the active profile should apply
 * @returns A Chrome extension rule to apply headers, or null if none should apply
 */
function buildSessionRuleFromProfile(
  profile: Profile,
  enabledTabIds: number[]
): chrome.declarativeNetRequest.Rule | null {
  if (enabledTabIds.length === 0) return null

  const enabledHeaders = profile.headers.filter(h => h.enabled && h.name.trim())
  if (enabledHeaders.length === 0) return null

  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []
  const responseHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []

  for (const header of enabledHeaders) {
    const headerInfo: chrome.declarativeNetRequest.ModifyHeaderInfo = {
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

  if (requestHeaders.length === 0 && responseHeaders.length === 0) return null

  const action: RuleAction = { type: 'modifyHeaders' }
  if (requestHeaders.length > 0) action.requestHeaders = requestHeaders
  if (responseHeaders.length > 0) action.responseHeaders = responseHeaders

  return {
    id: SESSION_RULE_ID,
    priority: 1,
    action: action as chrome.declarativeNetRequest.RuleAction,
    condition: {
      urlFilter: '*',
      tabIds: enabledTabIds,
      resourceTypes: RESOURCE_TYPES,
    },
  }
}

const tabUrls = new Map<number, string>()
let latestState: AppState | null = null
let hasClearedDynamicRules = false
let pendingUpdate = false
let updateInFlight: Promise<void> | null = null
let pendingActionUpdate = false
let actionUpdateInFlight: Promise<void> | null = null
let lastAppliedIconKey: string | null = null
let lastBadgeText: string | null = null
let badgeStyleInitialized = false

async function clearDynamicRulesOnce(): Promise<void> {
  if (hasClearedDynamicRules) return
  try {
    const dynamic = await chrome.declarativeNetRequest.getDynamicRules()
    const ids = dynamic.map(r => r.id)
    if (ids.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids })
    }
  } catch (error) {
    console.warn('Failed to clear dynamic rules (continuing):', error)
  } finally {
    hasClearedDynamicRules = true
  }
}

function computeEnabledTabIds(profile: Profile): number[] {
  const enabled: number[] = []

  for (const [tabId, url] of tabUrls.entries()) {
    if (!isHttpUrl(url)) continue
    if (isProfileEnabledForTabUrl(profile, url)) {
      enabled.push(tabId)
    }
  }

  return enabled
}

async function setActionIcon(profile: Profile | null, profileNumber: number): Promise<void> {
  if (!profile || !CAN_RENDER_CUSTOM_ICON) {
    if (lastAppliedIconKey === 'default') return
    await chrome.action.setIcon({ path: DEFAULT_ICON_PATHS })
    lastAppliedIconKey = 'default'
    return
  }

  const profileColor = normalizeProfileColor(profile.color)
  const iconKey = `profile:${profileColor}:${profileNumber}`
  if (lastAppliedIconKey === iconKey) return

  const iconSet = createProfileIconSet(profileColor, profileNumber)
  if (!iconSet) {
    if (lastAppliedIconKey === 'default') return
    await chrome.action.setIcon({ path: DEFAULT_ICON_PATHS })
    lastAppliedIconKey = 'default'
    return
  }

  await chrome.action.setIcon({ imageData: iconSet })
  lastAppliedIconKey = iconKey
}

async function getActiveTabUrl(): Promise<string | undefined> {
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!activeTab) return undefined

  if (activeTab.url) return activeTab.url
  if (activeTab.id === undefined) return undefined
  return tabUrls.get(activeTab.id)
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
    await setActionIcon(profile, profileNumber)

    if (!profile) {
      await setActionBadgeText('')
      return
    }

    const activeTabUrl = await getActiveTabUrl()
    const appliedHeaderCount = getAppliedHeaderCountForUrl(profile, activeTabUrl)
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

async function updateRulesOnce(): Promise<void> {
  try {
    await clearDynamicRulesOnce()

    if (!latestState) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [SESSION_RULE_ID],
      })
      return
    }

    const profile = getActiveProfile(latestState)
    if (!profile) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [SESSION_RULE_ID],
      })
      return
    }

    const enabledTabIds = computeEnabledTabIds(profile)
    const rule = buildSessionRuleFromProfile(profile, enabledTabIds)

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [SESSION_RULE_ID],
      addRules: rule ? [rule] : [],
    })

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        'Session rules updated:',
        rule ? 1 : 0,
        'active;',
        enabledTabIds.length,
        'tab(s) matched'
      )
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

function updateTabUrl(tabId: number, url: string | undefined): void {
  if (!url) return
  tabUrls.set(tabId, url)
  queueUpdateRules()
}

// Track tab URL changes so we can apply rules based on the top-level site (tab URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateTabUrl(tabId, changeInfo.url)
    return
  }

  if (changeInfo.status === 'complete' && tab.url) {
    updateTabUrl(tabId, tab.url)
  }
})

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && tab.url) {
    updateTabUrl(tab.id, tab.url)
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrls.delete(tabId)
  queueUpdateRules()
})

chrome.tabs.onActivated.addListener(() => {
  queueUpdateActionAppearance()
})

// Initialize on startup
async function initialize(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  latestState = result[STORAGE_KEY] as AppState | null

  // Prime tab URL cache
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        tabUrls.set(tab.id, tab.url)
      }
    }
  } catch (error) {
    console.warn('Failed to query tabs on startup:', error)
  }

  queueUpdateRules()
}

chrome.runtime.onInstalled.addListener(async () => {
  await initialize()
})

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
