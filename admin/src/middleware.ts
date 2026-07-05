import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { MUST_CHANGE_PASSWORD_COOKIE, SESSION_COOKIE } from '@/lib/auth/constants'

export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const mustChangePassword = Boolean(request.cookies.get(MUST_CHANGE_PASSWORD_COOKIE)?.value)

  if (mustChangePassword && !request.nextUrl.pathname.startsWith('/dashboard/account')) {
    return NextResponse.redirect(new URL('/dashboard/account?required=password', request.url))
  }

  if (hasSessionCookie) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
