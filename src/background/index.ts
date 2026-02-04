import type { HeaderRule, AppState, Profile } from '../types'
import { isProfileEnabledForTabUrl } from '../lib/urlFilters'

declare const process: { env?: { [key: string]: string | undefined } } | undefined

const STORAGE_KEY = 'openheaders_state'
const SESSION_RULE_ID = 1
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

    const profile = latestState.profiles.find(p => p.id === latestState?.activeProfileId) ?? null
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
