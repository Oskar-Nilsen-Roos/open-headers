import type { Profile, UrlFilter, UrlFilterMatchType } from '../types'

/**
 * Request filters are evaluated by Chrome itself (declarativeNetRequest) against the
 * URL of each outgoing request. This module translates a UrlFilter into the matching
 * rule `condition` fields; it does not match URLs in JavaScript.
 */

export interface RequestCondition {
  urlFilter?: string
  regexFilter?: string
  requestDomains?: string[]
}

/** Condition used when a profile has no include filters: every request matches. */
export const ALL_REQUESTS_CONDITION: RequestCondition = { urlFilter: '*' }

// http(s) plus the websocket schemes, which are separate request URLs for DNR.
const SCHEME = '(?:https?|wss?)://'
const URL_FILTER_SPECIAL_CHARS = /[*^|]/
const ASCII_ONLY = /^[\x20-\x7e]+$/

export function normalizeHostPattern(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`)
    return url.hostname.toLowerCase()
  } catch {
    // Return null for invalid hostnames/URLs so callers can treat as non-match.
    return null
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
}

function getMatchType(filter: UrlFilter): UrlFilterMatchType {
  return filter.matchType ?? 'dnr_url_filter'
}

/**
 * A filter is "active" when it is enabled and has something to match. Blank rows
 * (e.g. a freshly added filter) are ignored. Localhost may be blank: it means any port.
 */
export function isFilterActive(filter: UrlFilter): boolean {
  if (!filter.enabled) return false
  if (filter.pattern.trim()) return true
  return getMatchType(filter) === 'localhost_port'
}

export function hasActiveIncludeFilter(filters: UrlFilter[]): boolean {
  return filters.some(f => f.type === 'include' && isFilterActive(f))
}

/** Port requested by a localhost filter: `null` for any port, `undefined` if the pattern is invalid. */
function parseLocalhostPort(pattern: string): string | null | undefined {
  const trimmed = pattern.trim()
  const lower = trimmed.toLowerCase()
  if (!trimmed || lower === 'localhost') return null

  let port: string | null | undefined
  if (trimmed.includes('://')) {
    try {
      const parsed = new URL(trimmed)
      if (parsed.hostname !== 'localhost') return undefined
      port = parsed.port || null
    } catch {
      return undefined
    }
  } else if (lower.startsWith('localhost')) {
    const match = lower.match(/^localhost(?::(\d+))?$/)
    if (!match) return undefined
    port = match[1] ?? null
  } else if (/^:?\d+$/.test(lower)) {
    port = lower.startsWith(':') ? lower.slice(1) : lower
  } else {
    return undefined
  }

  return port
}

function localhostRegex(port: string | null): string {
  const end = '(?:[/?#]|$)'
  if (port === null) return `^${SCHEME}localhost(?::[0-9]+)?${end}`
  // Chrome drops default ports from URLs, so :80 / :443 also match the bare host.
  if (port === '80') return `^(?:${SCHEME}localhost:80|(?:http|ws)://localhost)${end}`
  if (port === '443') return `^(?:${SCHEME}localhost:443|(?:https|wss)://localhost)${end}`
  return `^${SCHEME}localhost:${port}${end}`
}

/**
 * Glob patterns use DNR `urlFilter` syntax (`*` wildcard, `|` anchors, `^` separator).
 * Unanchored DNR patterns match anywhere in the URL, so anchor both ends unless the
 * user already did — `https://example.com/*` must not match `https://evil.test/?u=https://example.com/x`.
 */
function globToUrlFilter(pattern: string): string | null {
  let urlFilter = pattern.trim()
  if (!urlFilter || !ASCII_ONLY.test(urlFilter)) return null
  if (urlFilter.startsWith('||*')) return null

  if (!urlFilter.startsWith('|') && !urlFilter.startsWith('*')) urlFilter = `|${urlFilter}`
  if (!/[*|^]$/.test(urlFilter)) urlFilter = `${urlFilter}|`
  return urlFilter
}

/**
 * Translates a filter into the DNR condition fields that select matching request URLs.
 * Returns null when the filter is blank or cannot be expressed (invalid host, glob, port…).
 * Regex patterns are returned as-is; callers must check RE2 support separately.
 */
export function filterToCondition(filter: UrlFilter): RequestCondition | null {
  if (!isFilterActive(filter)) return null
  const pattern = filter.pattern.trim()

  switch (getMatchType(filter)) {
    case 'host_equals': {
      const host = normalizeHostPattern(pattern)
      if (!host) return null
      return { regexFilter: `^${SCHEME}${escapeRegex(host)}(?::[0-9]+)?(?:[/?#]|$)` }
    }
    case 'host_ends_with': {
      const domain = normalizeHostPattern(pattern)
      if (!domain) return null
      return { requestDomains: [domain] }
    }
    case 'url_starts_with': {
      const prefix = pattern.includes('://') ? '^' : `^${SCHEME}`
      return { regexFilter: `${prefix}${escapeRegex(pattern)}` }
    }
    case 'path_starts_with': {
      const path = pattern.startsWith('/') ? pattern : `/${pattern}`
      return { regexFilter: `^${SCHEME}[^/?#]*${escapeRegex(path)}` }
    }
    case 'url_contains': {
      if (!URL_FILTER_SPECIAL_CHARS.test(pattern) && ASCII_ONLY.test(pattern)) {
        return { urlFilter: pattern }
      }
      return { regexFilter: escapeRegex(pattern) }
    }
    case 'localhost_port': {
      const port = parseLocalhostPort(pattern)
      if (port === undefined) return null
      return { regexFilter: localhostRegex(port) }
    }
    case 'regex':
      return { regexFilter: pattern }
    case 'dnr_url_filter':
    default: {
      const urlFilter = globToUrlFilter(pattern)
      return urlFilter ? { urlFilter } : null
    }
  }
}

export interface ProfileConditions {
  /** Conditions of requests that should receive the headers. Empty means nothing is sent. */
  includes: RequestCondition[]
  /** Conditions of requests that must never receive the headers. */
  excludes: RequestCondition[]
}

function isConditionSupported(
  condition: RequestCondition,
  isRegexSupported: (regex: string) => boolean
): boolean {
  return !condition.regexFilter || isRegexSupported(condition.regexFilter)
}

/**
 * Resolves a profile's filters into include/exclude conditions.
 *
 * - No active include filters: the profile applies to all requests (`*`).
 * - Active include filters that cannot be expressed apply to nothing (never to everything).
 * - An exclude filter that cannot be expressed fails closed: nothing is sent at all,
 *   because silently ignoring it would send headers to URLs the user excluded.
 */
export function resolveProfileConditions(
  profile: Profile,
  isRegexSupported: (regex: string) => boolean = () => true
): ProfileConditions {
  const active = (profile.urlFilters ?? []).filter(isFilterActive)
  const includeFilters = active.filter(f => f.type === 'include')
  const excludeFilters = active.filter(f => f.type === 'exclude')

  const excludes: RequestCondition[] = []
  for (const filter of excludeFilters) {
    const condition = filterToCondition(filter)
    if (!condition || !isConditionSupported(condition, isRegexSupported)) {
      return { includes: [], excludes: [] }
    }
    excludes.push(condition)
  }

  if (includeFilters.length === 0) {
    return { includes: [ALL_REQUESTS_CONDITION], excludes }
  }

  const includes: RequestCondition[] = []
  for (const filter of includeFilters) {
    const condition = filterToCondition(filter)
    if (condition && isConditionSupported(condition, isRegexSupported)) {
      includes.push(condition)
    }
  }

  return { includes, excludes }
}

/** Every regexFilter the profile needs, so callers can ask Chrome whether RE2 supports them. */
export function collectRegexFilters(profile: Profile): string[] {
  const { includes, excludes } = resolveProfileConditions(profile)
  const regexes = new Set<string>()
  for (const condition of [...includes, ...excludes]) {
    if (condition.regexFilter) regexes.add(condition.regexFilter)
  }
  return [...regexes]
}

/**
 * Checks whether Chrome can evaluate a regex filter. Chrome uses RE2, which lacks
 * lookaheads and backreferences that JavaScript allows. Outside the extension
 * (dev server, tests) falls back to compiling it as a JavaScript RegExp.
 */
export async function isRegexSupported(regex: string): Promise<boolean> {
  const dnr = typeof chrome !== 'undefined' ? chrome.declarativeNetRequest : undefined
  if (dnr?.isRegexSupported) {
    try {
      const result = await dnr.isRegexSupported({ regex, isCaseSensitive: true })
      return result.isSupported
    } catch {
      return false
    }
  }

  try {
    new RegExp(regex)
    return true
  } catch {
    return false
  }
}
