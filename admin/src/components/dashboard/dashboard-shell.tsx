'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { logout } from '@/lib/auth/actions'
import {
  getDashboardBreadcrumbs,
  isDashboardNavItemActive,
  type DashboardNavGroup,
} from '@/lib/dashboard/navigation'

export function DashboardShell({
  children,
  csrfToken,
  navGroups,
  notificationBadge,
  user,
}: {
  children: ReactNode
  csrfToken: string
  navGroups: DashboardNavGroup[]
  notificationBadge?: {
    critical: number
    unread: number
  }
  user: {
    email: string
    mustChangePassword: boolean
    name: string
  }
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar
        navGroups={navGroups}
        pathname={pathname}
        className="hidden lg:flex"
        mustChangePassword={user.mustChangePassword}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <Sidebar
            navGroups={navGroups}
            pathname={pathname}
            className="relative h-full w-[min(20rem,88vw)]"
            mustChangePassword={user.mustChangePassword}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className="min-w-0">
        <DashboardHeader
          csrfToken={csrfToken}
          notificationBadge={notificationBadge}
          user={user}
          onMenuClick={() => setMobileOpen(true)}
          pathname={pathname}
        />
        {children}
      </div>
    </div>
  )
}

export function Sidebar({
  className = '',
  mustChangePassword,
  navGroups,
  onNavigate,
  pathname,
}: {
  className?: string
  mustChangePassword: boolean
  navGroups: DashboardNavGroup[]
  onNavigate?: () => void
  pathname: string
}) {
  return (
    <aside
      className={`${className} flex-col border-r border-black/10 bg-[var(--ink)] px-5 py-5 text-white`}
    >
      <Link href="/dashboard" className="block rounded-md px-2 py-1" onClick={onNavigate}>
        <p className="font-mono text-xs tracking-[0.2em] text-white/50 uppercase">ZiftLab</p>
        <p className="mt-2 text-xl font-semibold">Admin</p>
      </Link>

      {mustChangePassword && (
        <p className="mt-6 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
          Cambia tu contrasena temporal para habilitar el resto del dashboard.
        </p>
      )}

      <nav className="mt-8 grid gap-7">
        {navGroups.map((group) => (
          <section key={group.label}>
            <p className="px-2 font-mono text-[0.68rem] tracking-[0.18em] text-white/42 uppercase">
              {group.label}
            </p>
            <div className="mt-2 grid gap-1">
              {group.items.map((item) => {
                const active = isDashboardNavItemActive(pathname, item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-white text-[var(--ink)] shadow-sm'
                        : 'text-white/72 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  )
}

export function DashboardHeader({
  csrfToken,
  notificationBadge,
  onMenuClick,
  pathname,
  user,
}: {
  csrfToken: string
  notificationBadge?: {
    critical: number
    unread: number
  }
  onMenuClick: () => void
  pathname: string
  user: {
    email: string
    name: string
  }
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-semibold lg:hidden"
            aria-label="Abrir menu"
          >
            Menu
          </button>
          <div className="min-w-0">
            <Breadcrumbs pathname={pathname} />
            <p className="mt-1 truncate text-sm text-[var(--muted)]">{user.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SearchPlaceholder />
          <Link
            href="/dashboard/notifications"
            className={`hidden rounded-md border px-3 py-2 text-sm font-semibold transition hover:border-[var(--ink)] sm:inline-flex ${
              notificationBadge?.critical
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Avisos {notificationBadge?.unread ? `(${notificationBadge.unread})` : ''}
          </Link>
          <Link
            href="/dashboard/account"
            className="hidden rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)] sm:inline-flex"
          >
            Cuenta
          </Link>
          <Link
            href="/api/health"
            className="hidden rounded-md border border-[var(--line)] px-3 py-2 font-mono text-xs tracking-[0.12em] text-[var(--muted)] uppercase transition hover:border-[var(--ink)] hover:text-[var(--ink)] md:inline-flex"
          >
            Health
          </Link>
          <form action={logout}>
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <button
              type="submit"
              className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

export function Breadcrumbs({ pathname }: { pathname: string }) {
  const breadcrumbs = getDashboardBreadcrumbs(pathname)

  return (
    <nav aria-label="Breadcrumbs" className="flex min-w-0 items-center gap-2 text-xs">
      {breadcrumbs.map((breadcrumb, index) => {
        const last = index === breadcrumbs.length - 1

        return (
          <span key={`${breadcrumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span className="text-[var(--muted)]">/</span>}
            {breadcrumb.href && !last ? (
              <Link
                href={breadcrumb.href}
                className="truncate font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="truncate font-semibold text-[var(--ink)]">{breadcrumb.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export function SearchPlaceholder() {
  return (
    <button
      type="button"
      disabled
      title="Busqueda global futura"
      className="hidden h-10 min-w-60 cursor-not-allowed items-center justify-between rounded-md border border-[var(--line)] bg-[var(--background)] px-3 text-left text-sm text-[var(--muted)] opacity-80 xl:flex"
    >
      <span>Buscar en el admin</span>
      <span className="font-mono text-xs">Pronto</span>
    </button>
  )
}
