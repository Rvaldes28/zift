import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  MUST_CHANGE_PASSWORD_COOKIE,
  MUST_SETUP_2FA_COOKIE,
  SESSION_COOKIE,
} from '@/lib/auth/constants'

const CSRF_COOKIE = 'ziftlab-admin-csrf'

function csrfSecret() {
  return process.env.ADMIN_CSRF_SECRET?.trim() || process.env.ADMIN_BOOTSTRAP_TOKEN?.trim() || 'ziftlab-dev-csrf'
}

function randomNonce() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function signCsrf(nonce: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(csrfSecret()),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function withCsrfCookie(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value
  const nonce = existing?.split('.')[0] || randomNonce()
  const token = `${nonce}.${await signCsrf(nonce)}`

  request.cookies.set(CSRF_COOKIE, token)
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}

export async function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const mustChangePassword = Boolean(request.cookies.get(MUST_CHANGE_PASSWORD_COOKIE)?.value)
  const mustSetupTwoFactor = Boolean(request.cookies.get(MUST_SETUP_2FA_COOKIE)?.value)

  if (mustChangePassword && !request.nextUrl.pathname.startsWith('/dashboard/account')) {
    return withCsrfCookie(
      request,
      NextResponse.redirect(new URL('/dashboard/account?required=password', request.url)),
    )
  }

  if (mustSetupTwoFactor && !request.nextUrl.pathname.startsWith('/dashboard/account')) {
    return withCsrfCookie(
      request,
      NextResponse.redirect(new URL('/dashboard/account?required=2fa', request.url)),
    )
  }

  if (hasSessionCookie) return withCsrfCookie(request, NextResponse.next())

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  if (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/login/2fa' ||
    request.nextUrl.pathname === '/register'
  ) {
    return withCsrfCookie(request, NextResponse.next())
  }
  return withCsrfCookie(request, NextResponse.redirect(loginUrl))
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/login/2fa', '/register'],
}
