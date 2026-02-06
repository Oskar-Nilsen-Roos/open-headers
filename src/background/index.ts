import type { HeaderRule, AppState, Profile } from '../types'
import { isProfileEnabledForTabUrl } from '../lib/urlFilters'
import {
  DEFAULT_ACTION_ICON_PATHS,
  type BadgeState,
  createBadgeState,
  getActiveProfileDescriptor,
  getProfileActionColors,
  getProfileActionLabel,
} from './actionAppearance'

declare const process: { env?: { [key: string]: string | undefined } } | undefined

const STORAGE_KEY = 'openheaders_state'
const SESSION_RULE_ID = 1
const ACTION_ICON_SIZES = [16, 32, 48, 128] as const
const PROFILE_ICON_FONT_FAMILY = '"Avenir Next", "SF Pro Text", "Segoe UI", "Inter", "Helvetica Neue", sans-serif'
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
let usesNativeBadgeFallback = false

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

interface NormalizedTextMetrics {
  ascent: number
  descent: number
  left: number
  right: number
}

function normalizeTextMetrics(metrics: TextMetrics, fontSize: number): NormalizedTextMetrics {
  const hasBoxMetrics = typeof metrics.actualBoundingBoxAscent === 'number'
    && typeof metrics.actualBoundingBoxDescent === 'number'
    && typeof metrics.actualBoundingBoxLeft === 'number'
    && typeof metrics.actualBoundingBoxRight === 'number'

  if (hasBoxMetrics) {
    return {
      ascent: metrics.actualBoundingBoxAscent,
      descent: metrics.actualBoundingBoxDescent,
      left: metrics.actualBoundingBoxLeft,
      right: metrics.actualBoundingBoxRight,
    }
  }

  return {
    ascent: fontSize * 0.75,
    descent: fontSize * 0.25,
    left: 0,
    right: metrics.width,
  }
}

function resolveProfileLabelFontSize(
  context: OffscreenCanvasRenderingContext2D,
  label: string,
  size: number,
  radius: number
): number {
  const minFontSize = Math.max(6, Math.floor(size * 0.32))
  const maxFontSize = Math.max(minFontSize, Math.floor(size * 0.8))
  const maxLabelWidth = radius * 1.48
  const maxLabelHeight = radius * 1.42

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
    context.font = `700 ${fontSize}px ${PROFILE_ICON_FONT_FAMILY}`
    const metrics = normalizeTextMetrics(context.measureText(label), fontSize)
    const labelWidth = metrics.left + metrics.right
    const labelHeight = metrics.ascent + metrics.descent

    if (labelWidth <= maxLabelWidth && labelHeight <= maxLabelHeight) {
      return fontSize
    }
  }

  return minFontSize
}

function drawRoundedRect(
  context: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function getCompactBadgeText(text: string, size: number): string {
  if (size <= 16 && text.length > 1) return '9+'
  if (size <= 24 && text.length > 2) return '99'
  return text
}

function drawProfileCountTag(
  context: OffscreenCanvasRenderingContext2D,
  size: number,
  text: string
): void {
  if (!text) return

  const compactText = getCompactBadgeText(text, size)
  const margin = Math.max(1, Math.round(size * 0.06))
  const badgeHeight = Math.min(16, Math.max(6, Math.round(size * 0.28)))
  const horizontalPadding = Math.max(2, Math.round(size * 0.06))
  const fontSize = Math.max(5, Math.round(badgeHeight * 0.58))

  context.font = `700 ${fontSize}px ${PROFILE_ICON_FONT_FAMILY}`
  const textWidth = context.measureText(compactText).width
  const maxWidth = size - margin * 2
  const badgeWidth = Math.max(
    badgeHeight,
    Math.min(maxWidth, Math.ceil(textWidth + horizontalPadding * 2))
  )

  const x = size - margin - badgeWidth
  const y = margin

  drawRoundedRect(context, x, y, badgeWidth, badgeHeight, badgeHeight / 2)
  context.fillStyle = 'rgba(15, 23, 42, 0.96)'
  context.fill()
  context.lineWidth = Math.max(1, size * 0.03)
  context.strokeStyle = 'rgba(248, 250, 252, 0.34)'
  context.stroke()

  context.fillStyle = '#f8fafc'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(compactText, x + badgeWidth / 2, y + badgeHeight / 2 + size * 0.01)
}

function renderProfileIcon(
  size: number,
  label: string,
  backgroundColor: string,
  textColor: string,
  badgeText: string
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

  const fontSize = resolveProfileLabelFontSize(context, label, size, radius)
  context.font = `700 ${fontSize}px ${PROFILE_ICON_FONT_FAMILY}`
  const metrics = normalizeTextMetrics(context.measureText(label), fontSize)
  const textX = center + (metrics.left - metrics.right) / 2
  const textY = center + (metrics.ascent - metrics.descent) / 2
  context.fillStyle = textColor
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText(label, textX, textY)

  drawProfileCountTag(context, size, badgeText)

  return context.getImageData(0, 0, size, size)
}

function buildProfileActionIcon(
  profileIndex: number,
  backgroundColor: string,
  textColor: string,
  badgeText: string
): Record<number, ImageData> | null {
  const label = getProfileActionLabel(profileIndex)
  const iconBySize: Partial<Record<number, ImageData>> = {}

  for (const size of ACTION_ICON_SIZES) {
    const imageData = renderProfileIcon(size, label, backgroundColor, textColor, badgeText)
    if (!imageData) return null
    iconBySize[size] = imageData
  }

  return iconBySize as Record<number, ImageData>
}

async function clearNativeBadge(): Promise<void> {
  if (lastBadgeSignature === '') return
  await chrome.action.setBadgeText({ text: '' })
  lastBadgeSignature = ''
}

async function updateNativeBadge(badgeState: BadgeState): Promise<void> {
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

async function updateActionIcon(
  profile: Profile | null,
  profileIndex: number,
  badgeState: BadgeState
): Promise<void> {
  const iconSignature = profile
    ? `${profile.id}:${profileIndex}:${profile.color}:${badgeState.text}`
    : 'default'

  if (iconSignature === lastActionIconSignature) {
    if (usesNativeBadgeFallback) {
      await updateNativeBadge(badgeState)
    } else {
      await clearNativeBadge()
    }
    return
  }

  if (!profile) {
    await chrome.action.setIcon({ path: DEFAULT_ACTION_ICON_PATHS })
    usesNativeBadgeFallback = false
    await clearNativeBadge()
    lastActionIconSignature = iconSignature
    return
  }

  const palette = getProfileActionColors(profile)
  const imageData = buildProfileActionIcon(
    profileIndex,
    palette.backgroundColor,
    palette.textColor,
    badgeState.text
  )

  if (!imageData) {
    await chrome.action.setIcon({ path: DEFAULT_ACTION_ICON_PATHS })
    usesNativeBadgeFallback = true
    await updateNativeBadge(badgeState)
    lastActionIconSignature = iconSignature
    return
  }

  await chrome.action.setIcon({ imageData })
  usesNativeBadgeFallback = false
  await clearNativeBadge()
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

async function syncActionAppearance(profile: Profile | null, profileIndex: number): Promise<void> {
  const activeTabUrl = await getActiveTabUrl()
  const badgeState = createBadgeState(profile, activeTabUrl)

  try {
    await updateActionIcon(profile, profileIndex, badgeState)
  } catch (error) {
    console.error('Failed to update action icon:', error)
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
    const newState = changes[STORAGE_KEY].newValue
    latestState = newState && typeof newState === 'object'
      ? newState as AppState
      : null
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
