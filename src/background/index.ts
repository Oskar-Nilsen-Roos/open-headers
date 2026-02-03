import type { HeaderRule, AppState } from '../types'

const STORAGE_KEY = 'openheaders_state'

interface RuleAction {
  type: 'modifyHeaders'
  requestHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]
  responseHeaders?: chrome.declarativeNetRequest.ModifyHeaderInfo[]
}

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
 * Builds Chrome declarativeNetRequest rules from the active profile
 * @param state - The application state containing profiles
 * @returns Array of Chrome extension rules to apply headers
 */
function buildRulesFromActiveProfile(state: AppState): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = []
  let ruleId = 1

  // Find the active profile
  const profile = state.profiles.find(p => p.id === state.activeProfileId)

  if (!profile) {
    return rules
  }

  const enabledHeaders = profile.headers.filter(h => h.enabled && h.name.trim())
  if (enabledHeaders.length === 0) {
    return rules
  }

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

  if (requestHeaders.length > 0 || responseHeaders.length > 0) {
    const action: RuleAction = {
      type: 'modifyHeaders',
    }

    if (requestHeaders.length > 0) {
      action.requestHeaders = requestHeaders
    }
    if (responseHeaders.length > 0) {
      action.responseHeaders = responseHeaders
    }

    // Build URL filter condition
    const includeFilters = profile.urlFilters.filter(f => f.enabled && f.type === 'include' && f.pattern.trim())

    if (includeFilters.length > 0) {
      // Create a rule for each include filter
      for (const filter of includeFilters) {
        rules.push({
          id: ruleId++,
          priority: 1,
          action: action as chrome.declarativeNetRequest.RuleAction,
          condition: {
            urlFilter: filter.pattern,
            resourceTypes: [
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
            ] as chrome.declarativeNetRequest.ResourceType[],
          },
        })
      }
    } else {
      // No include filters, apply to all URLs
      rules.push({
        id: ruleId++,
        priority: 1,
        action: action as chrome.declarativeNetRequest.RuleAction,
        condition: {
          urlFilter: '*',
          resourceTypes: [
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
          ] as chrome.declarativeNetRequest.ResourceType[],
        },
      })
    }
  }

  return rules
}

async function updateRules(state: AppState): Promise<void> {
  try {
    // Get existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules()
    const existingRuleIds = existingRules.map(rule => rule.id)

    // Build new rules from active profile only
    const newRules = buildRulesFromActiveProfile(state)

    // Update rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules,
    })

    console.log('Rules updated:', newRules.length, 'rules active')
  } catch (error) {
    console.error('Failed to update rules:', error)
  }
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    const newState = changes[STORAGE_KEY].newValue as AppState
    if (newState) {
      updateRules(newState)
    }
  }
})

// Initialize on startup
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const state = result[STORAGE_KEY] as AppState | undefined
  if (state) {
    await updateRules(state)
  }
})

// Also update on startup (not just install)
chrome.storage.local.get(STORAGE_KEY).then((result) => {
  const state = result[STORAGE_KEY] as AppState | undefined
  if (state) {
    updateRules(state)
  }
})

// Message handler for popup communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_RULES') {
    chrome.declarativeNetRequest.getDynamicRules().then(rules => {
      sendResponse({ rules })
    })
    return true // Keep channel open for async response
  }
})
