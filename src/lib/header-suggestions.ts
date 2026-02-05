export const COMMON_REQUEST_HEADER_NAMES = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'DNT',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Origin',
  'Pragma',
  'Range',
  'Referer',
  'Sec-CH-UA',
  'Sec-CH-UA-Mobile',
  'Sec-CH-UA-Platform',
  'Sec-Fetch-Dest',
  'Sec-Fetch-Mode',
  'Sec-Fetch-Site',
  'Sec-Fetch-User',
  'Upgrade-Insecure-Requests',
  'User-Agent',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Real-IP',
  'X-Requested-With',
]

export function normalizeHeaderKey(value: string): string {
  return value.trim().toLowerCase()
}

export function getCanonicalHeaderName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const normalized = normalizeHeaderKey(trimmed)
  const match = COMMON_REQUEST_HEADER_NAMES.find(
    name => normalizeHeaderKey(name) === normalized
  )
  return match ?? trimmed
}
