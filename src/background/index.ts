import type { HeaderRule, AppState, Profile } from '../types'
import { isProfileEnabledForTabUrl } from '../lib/urlFilters'
import {
  DEFAULT_ACTION_ICON_PATHS,
  createBadgeState,
  getActiveProfileDescriptor,
  getProfileActionColors,
  getProfileActionLabel,
} from './actionAppearance'

declare const process: { env?: { [key: string]: string | undefined } } | undefined

const STORAGE_KEY = 'openheaders_state'
const SESSION_RULE_ID = 1
const ACTION_ICON_SIZES = [16, 32, 48, 128] as const
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
let lastActionIconSignature: string | null = null
let lastBadgeSignature: string | null = null

function hasTabId(tab: chrome.tabs.Tab): tab is chrome.tabs.Tab & { id: number } {
  return typeof tab.id === 'number'
}

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
    if (!url.startsWith('http://') && !url.startsWith('https://')) continue
    if (isProfileEnabledForTabUrl(profile, url)) {
      enabled.push(tabId)
    }
  }

  return enabled
}

function renderProfileIcon(
  size: number,
  label: string,
  backgroundColor: string,
  textColor: string
): ImageData | null {
  if (typeof OffscreenCanvas === 'undefined') return null

  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, size, size)

  const center = size / 2
  const radius = size * 0.42

  context.fillStyle = backgroundColor
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.fill()

  const fontScale = label.length >= 3
    ? 0.4
    : label.length === 2
      ? 0.52
      : 0.68
  const fontSize = Math.max(7, Math.floor(size * fontScale))

  context.fillStyle = textColor
  context.font = `700 ${fontSize}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, center, center + size * 0.02)

  return context.getImageData(0, 0, size, size)
}

function buildProfileActionIcon(
  profileIndex: number,
  backgroundColor: string,
  textColor: string
): Record<number, ImageData> | null {
  const label = getProfileActionLabel(profileIndex)
  const iconBySize: Partial<Record<number, ImageData>> = {}

  for (const size of ACTION_ICON_SIZES) {
    const imageData = renderProfileIcon(size, label, backgroundColor, textColor)
    if (!imageData) return null
    iconBySize[size] = imageData
  }

  return iconBySize as Record<number, ImageData>
}

async function updateActionIcon(profile: Profile | null, profileIndex: number): Promise<void> {
  const iconSignature = profile
    ? `${profile.id}:${profileIndex}:${profile.color}`
    : 'default'

  if (iconSignature === lastActionIconSignature) return

  if (!profile) {
    await chrome.action.setIcon({ path: DEFAULT_ACTION_ICON_PATHS })
    lastActionIconSignature = iconSignature
    return
  }

  const palette = getProfileActionColors(profile)
  const imageData = buildProfileActionIcon(profileIndex, palette.backgroundColor, palette.textColor)

  if (!imageData) {
    await chrome.action.setIcon({ path: DEFAULT_ACTION_ICON_PATHS })
    lastActionIconSignature = iconSignature
    return
  }

  await chrome.action.setIcon({ imageData })
  lastActionIconSignature = iconSignature
}

async function getActiveTabUrl(): Promise<string | undefined> {
  const [fromFocusedWindow] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const activeTab = fromFocusedWindow ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]

  if (!activeTab || !hasTabId(activeTab)) return undefined

  if (activeTab.url) {
    tabUrls.set(activeTab.id, activeTab.url)
    return activeTab.url
  }

  return tabUrls.get(activeTab.id)
}

async function updateActionBadge(profile: Profile | null): Promise<void> {
  const activeTabUrl = await getActiveTabUrl()
  const badgeState = createBadgeState(profile, activeTabUrl)
  const badgeSignature = `${badgeState.text}:${badgeState.backgroundColor}:${badgeState.textColor}`

  if (badgeSignature === lastBadgeSignature) return

  await chrome.action.setBadgeBackgroundColor({ color: badgeState.backgroundColor })

  const actionWithBadgeTextColor = chrome.action as typeof chrome.action & {
    setBadgeTextColor?: (details: { color: string }) => Promise<void>
  }
  if (typeof actionWithBadgeTextColor.setBadgeTextColor === 'function') {
    await actionWithBadgeTextColor.setBadgeTextColor({ color: badgeState.textColor })
  }

  await chrome.action.setBadgeText({ text: badgeState.text })
  lastBadgeSignature = badgeSignature
}

async function syncActionAppearance(profile: Profile | null, profileIndex: number): Promise<void> {
  try {
    await updateActionIcon(profile, profileIndex)
  } catch (error) {
    console.error('Failed to update action icon:', error)
  }

  try {
    await updateActionBadge(profile)
  } catch (error) {
    console.error('Failed to update action badge:', error)
  }
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
  const { profile, profileIndex } = getActiveProfileDescriptor(latestState)

  try {
    await clearDynamicRulesOnce()

    if (!profile) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [SESSION_RULE_ID],
      })
    } else {
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
    }
  } catch (error) {
    console.error('Failed to update rules:', error)
  }

  await syncActionAppearance(profile, profileIndex)
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    latestState = (changes[STORAGE_KEY].newValue as AppState | undefined) ?? null
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
  if (hasTabId(tab) && tab.url) {
    updateTabUrl(tab.id, tab.url)
    return
  }

  queueUpdateRules()
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.url) {
      tabUrls.set(tabId, tab.url)
    }
  } catch (error) {
    console.warn('Failed to read activated tab URL:', error)
  }

  queueUpdateRules()
})

chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrls.delete(tabId)
  queueUpdateRules()
})

// Initialize on startup
async function initialize(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  latestState = result[STORAGE_KEY] as AppState | null

  // Prime tab URL cache
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (hasTabId(tab) && tab.url) {
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
