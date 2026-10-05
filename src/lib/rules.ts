import type { HeaderRule, Profile } from '../types'
import { resolveProfileConditions, type RequestCondition } from './urlFilters'

export const RESOURCE_TYPES = [
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

const INCLUDE_PRIORITY = 1
// Chrome ignores lower-priority modifyHeaders rules once a higher-priority allow rule matches.
const EXCLUDE_PRIORITY = 2

export function headerOperationToChrome(operation: HeaderRule['operation']): `${chrome.declarativeNetRequest.HeaderOperation}` {
  switch (operation) {
    case 'remove':
      return 'remove'
    case 'append':
      return 'append'
    case 'set':
    default:
      return 'set'
  }
}

export function getEnabledHeaders(profile: Profile): HeaderRule[] {
  return profile.headers.filter(h => {
    if (!h.enabled || !h.name.trim()) return false
    // Chrome requires a value for set/append — omitting it silently rejects the entire rule
    if (h.operation !== 'remove' && !h.value?.trim()) return false
    return true
  })
}

function buildModifyHeadersAction(headers: HeaderRule[]): chrome.declarativeNetRequest.RuleAction | null {
  const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []
  const responseHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []

  for (const header of headers) {
    const info = {
      header: header.name,
      operation: headerOperationToChrome(header.operation),
      ...(header.operation !== 'remove' ? { value: header.value } : {}),
    } as chrome.declarativeNetRequest.ModifyHeaderInfo

    if (header.type === 'request') {
      requestHeaders.push(info)
    } else {
      responseHeaders.push(info)
    }
  }

  if (requestHeaders.length === 0 && responseHeaders.length === 0) return null

  return {
    type: 'modifyHeaders',
    ...(requestHeaders.length > 0 ? { requestHeaders } : {}),
    ...(responseHeaders.length > 0 ? { responseHeaders } : {}),
  } as chrome.declarativeNetRequest.RuleAction
}

function toRuleCondition(condition: RequestCondition): chrome.declarativeNetRequest.RuleCondition {
  return {
    ...condition,
    // URL paths are case-sensitive; keep matching the way the filter was typed.
    isUrlFilterCaseSensitive: true,
    resourceTypes: RESOURCE_TYPES,
  }
}

/**
 * Builds the session rules for a profile, matched against each request's URL:
 * one modifyHeaders rule per include condition (or a single catch-all when the profile
 * has no include filters) plus one higher-priority allow rule per exclude condition.
 *
 * @param isRegexSupported - whether Chrome (RE2) can evaluate a regexFilter; unsupported
 *   filters are dropped by resolveProfileConditions, failing closed for excludes.
 */
export function buildSessionRules(
  profile: Profile,
  isRegexSupported: (regex: string) => boolean = () => true
): chrome.declarativeNetRequest.Rule[] {
  const action = buildModifyHeadersAction(getEnabledHeaders(profile))
  if (!action) return []

  const { includes, excludes } = resolveProfileConditions(profile, isRegexSupported)
  if (includes.length === 0) return []

  const rules: chrome.declarativeNetRequest.Rule[] = []
  let nextId = 1

  for (const condition of excludes) {
    rules.push({
      id: nextId++,
      priority: EXCLUDE_PRIORITY,
      action: { type: 'allow' } as chrome.declarativeNetRequest.RuleAction,
      condition: toRuleCondition(condition),
    })
  }

  for (const condition of includes) {
    rules.push({
      id: nextId++,
      priority: INCLUDE_PRIORITY,
      action,
      condition: toRuleCondition(condition),
    })
  }

  return rules
}
