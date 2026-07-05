import 'server-only'

import { headers } from 'next/headers'

export interface RequestMeta {
  ipAddress: string | null
  userAgent: string | null
}

export async function requestMeta(): Promise<RequestMeta> {
  const headerStore = await headers()
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = headerStore.get('x-real-ip')?.trim()

  return {
    ipAddress: forwardedFor || realIp || null,
    userAgent: headerStore.get('user-agent'),
  }
}
