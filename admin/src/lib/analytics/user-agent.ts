import 'server-only'

export interface ParsedUserAgent {
  browser: string
  deviceType: string
  os: string
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = userAgent ?? ''
  const lower = ua.toLowerCase()

  const deviceType = /bot|crawl|spider|slurp|bingpreview/.test(lower)
    ? 'bot'
    : /ipad|tablet/.test(lower)
      ? 'tablet'
      : /mobi|iphone|android/.test(lower)
        ? 'mobile'
        : 'desktop'

  const browser = lower.includes('edg/')
    ? 'Edge'
    : lower.includes('opr/') || lower.includes('opera')
      ? 'Opera'
      : lower.includes('chrome/')
        ? 'Chrome'
        : lower.includes('safari/')
          ? 'Safari'
          : lower.includes('firefox/')
            ? 'Firefox'
            : lower.includes('bot')
              ? 'Bot'
              : 'Unknown'

  const os = lower.includes('windows')
    ? 'Windows'
    : lower.includes('mac os') || lower.includes('macintosh')
      ? 'macOS'
      : lower.includes('iphone') || lower.includes('ipad')
        ? 'iOS'
        : lower.includes('android')
          ? 'Android'
          : lower.includes('linux')
            ? 'Linux'
            : 'Unknown'

  return { browser, deviceType, os }
}
