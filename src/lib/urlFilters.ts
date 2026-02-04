import type { Profile, UrlFilter } from '@/types'

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

export function globToRegExp(glob: string): RegExp | null {
  const trimmed = glob.trim()
  if (!trimmed) return null

  // Treat '*' as the only special character (matches any chars).
  const escaped = trimmed
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*')

  return new RegExp(`^${escaped}$`)
}

export function matchesUrlFilter(tabUrl: string, filter: UrlFilter): boolean {
  const pattern = filter.pattern.trim()
  const matchType = filter.matchType ?? 'dnr_url_filter'

  if (!filter.enabled || (!pattern && matchType !== 'localhost_port')) {
    return false
  }

  let url: URL
  try {
    url = new URL(tabUrl)
  } catch {
    return false
  }

  switch (matchType) {
    case 'host_equals': {
      const host = normalizeHostPattern(pattern)
      if (!host) return false
      return url.hostname.toLowerCase() === host
    }
    case 'host_ends_with': {
      const domain = normalizeHostPattern(pattern)
      if (!domain) return false
      const hostname = url.hostname.toLowerCase()
      return hostname === domain || hostname.endsWith(`.${domain}`)
    }
    case 'url_starts_with': {
      const haystack = pattern.includes('://')
        ? url.href
        : `${url.host}${url.pathname}${url.search}${url.hash}`
      return haystack.startsWith(pattern)
    }
    case 'path_starts_with': {
      const normalized = pattern.startsWith('/') ? pattern : `/${pattern}`
      return url.pathname.startsWith(normalized)
    }
    case 'url_contains': {
      const haystack = pattern.includes('://')
        ? url.href
        : `${url.host}${url.pathname}${url.search}${url.hash}`
      return haystack.includes(pattern)
    }
    case 'localhost_port': {
      if (url.hostname !== 'localhost') return false
      if (!pattern || pattern.toLowerCase() === 'localhost') return true

      let port: string | null = null
      const lower = pattern.toLowerCase()

      if (pattern.includes('://')) {
        try {
          const parsed = new URL(pattern)
          if (parsed.hostname !== 'localhost') return false
          port = parsed.port || null
        } catch {
          return false
        }
      } else if (lower.startsWith('localhost')) {
        const match = lower.match(/^localhost(?::(\d+))?$/)
        if (!match) return false
        port = match[1] ?? null
      } else if (/^:?\d+$/.test(lower)) {
        port = lower.startsWith(':') ? lower.slice(1) : lower
      } else {
        return false
      }

      if (!port) return true

      if (url.port === port) return true
      if (url.port === '') {
        return (
          (url.protocol === 'http:' && port === '80') ||
          (url.protocol === 'https:' && port === '443')
        )
      }
      return false
    }
    case 'regex': {
      try {
        const re = new RegExp(pattern)
        return re.test(url.href)
      } catch {
        return false
      }
    }
    case 'dnr_url_filter': {
      const re = globToRegExp(pattern)
      return re ? re.test(url.href) : false
    }
    default: {
      const re = globToRegExp(pattern)
      return re ? re.test(url.href) : false
    }
  }
}

export function isProfileEnabledForTabUrl(profile: Profile, tabUrl: string): boolean {
  const enabledFilters = (profile.urlFilters ?? [])
    .filter(f => {
      if (!f.enabled) return false
      if (f.pattern.trim()) return true
      return (f.matchType ?? 'dnr_url_filter') === 'localhost_port'
    })

  const excludes = enabledFilters.filter(f => f.type === 'exclude')
  if (excludes.some(f => matchesUrlFilter(tabUrl, f))) {
    return false
  }

  const includes = enabledFilters.filter(f => f.type === 'include')
  if (includes.length === 0) {
    return true
  }

  return includes.some(f => matchesUrlFilter(tabUrl, f))
}
