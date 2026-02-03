import type { UrlFilter, UrlFilterMatchType } from '@/types'

export const URL_FILTER_MATCH_TYPE_LABELS: Record<UrlFilterMatchType, string> = {
  host_equals: 'Host equals',
  host_ends_with: 'Host ends with',
  url_starts_with: 'URL starts with',
  url_contains: 'URL contains',
  dnr_url_filter: 'Advanced (legacy)',
  regex: 'Regex',
}

export const URL_FILTER_MATCH_TYPE_PLACEHOLDERS: Record<UrlFilterMatchType, string> = {
  host_equals: 'example.com',
  host_ends_with: 'example.com',
  url_starts_with: 'https://example.com/app',
  url_contains: 'example.com/app',
  dnr_url_filter: '*.example.com/*',
  regex: '^https://example\\.com/.*$',
}

export type UrlFilterLike =
  & Pick<UrlFilter, 'enabled' | 'pattern' | 'type'>
  & Partial<Pick<UrlFilter, 'matchType'>>

function safeParseUrl(urlString: string): URL | null {
  try {
    return new URL(urlString)
  } catch {
    return null
  }
}

function normalizeHostPattern(pattern: string): string {
  const trimmed = pattern.trim()
  if (!trimmed) return ''

  // Remove scheme (if present) and strip path/query/hash
  const withoutScheme = trimmed.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
  const hostAndMaybePort = (withoutScheme.split(/[/?#]/)[0] ?? '').trim()
  if (!hostAndMaybePort) return ''

  // Strip credentials if user pasted something like user:pass@host
  const withoutCreds = (hostAndMaybePort.split('@').pop() ?? hostAndMaybePort).trim()

  // Strip port (best-effort, handles common host:port)
  const withoutPort = withoutCreds.includes(']')
    ? withoutCreds // likely IPv6 literal; keep as-is
    : (withoutCreds.split(':')[0] ?? withoutCreds)

  return withoutPort.trim().replace(/^\./, '').toLowerCase()
}

function globToRegExp(glob: string): RegExp {
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = glob.split('*').map(escapeRegExp)
  return new RegExp(parts.join('.*'))
}

export function doesUrlFilterMatch(tabUrl: string, filter: UrlFilterLike): boolean {
  const url = safeParseUrl(tabUrl)
  if (!url) return false

  const rawPattern = filter.pattern.trim()
  if (!rawPattern) return false

  const matchType: UrlFilterMatchType = filter.matchType ?? 'dnr_url_filter'

  switch (matchType) {
    case 'host_equals': {
      const host = url.hostname.toLowerCase()
      const expected = normalizeHostPattern(rawPattern)
      return !!expected && host === expected
    }
    case 'host_ends_with': {
      const host = url.hostname.toLowerCase()
      const expected = normalizeHostPattern(rawPattern)
      return !!expected && (host === expected || host.endsWith(`.${expected}`))
    }
    case 'url_starts_with': {
      const compare = rawPattern.includes('://')
        ? url.href
        : `${url.host}${url.pathname}${url.search}${url.hash}`
      return compare.startsWith(rawPattern)
    }
    case 'url_contains': {
      const compare = rawPattern.includes('://')
        ? url.href
        : `${url.host}${url.pathname}${url.search}${url.hash}`
      return compare.includes(rawPattern)
    }
    case 'regex': {
      try {
        const re = new RegExp(rawPattern)
        return re.test(url.href)
      } catch {
        return false
      }
    }
    case 'dnr_url_filter': {
      try {
        const re = globToRegExp(rawPattern)
        return re.test(url.href)
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

/**
 * Determines whether a tab URL is allowed by a set of URL filters.
 *
 * Semantics:
 * - If any enabled exclude filter matches → blocked
 * - Else if no enabled include filters exist → allowed
 * - Else allowed if any enabled include filter matches
 */
export function isUrlAllowedByFilters(tabUrl: string, filters: UrlFilterLike[]): boolean {
  const enabledExclude = filters.filter(f => f.enabled && f.type === 'exclude' && f.pattern.trim())
  if (enabledExclude.some(f => doesUrlFilterMatch(tabUrl, f))) {
    return false
  }

  const enabledInclude = filters.filter(f => f.enabled && f.type === 'include' && f.pattern.trim())
  if (enabledInclude.length === 0) {
    return true
  }

  return enabledInclude.some(f => doesUrlFilterMatch(tabUrl, f))
}

