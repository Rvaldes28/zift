import Link from 'next/link'

import { logout } from '@/lib/auth/actions'
import { requirePermission } from '@/lib/rbac/access'
import type { PermissionSlug } from '@/lib/rbac/permissions'

const navItems = [
  { label: 'Resumen', href: '/dashboard', permission: 'dashboard.access' },
  { label: 'Usuarios', href: '/dashboard/users', permission: 'users.read' },
  { label: 'Roles', href: '/dashboard/roles', permission: 'roles.read' },
  { label: 'Actividad', href: '/dashboard/activity', permission: 'audit.read' },
  { label: 'Contenido', href: '/dashboard#contenido', permission: 'content.read' },
  { label: 'SEO', href: '/dashboard#seo', permission: 'seo.read' },
  { label: 'Leads', href: '/dashboard#leads', permission: 'leads.read' },
  { label: 'Sistema', href: '/dashboard#sistema', permission: 'settings.read' },
  { label: 'Cuenta', href: '/dashboard/account' },
] satisfies Array<{ label: string; href: string; permission?: PermissionSlug }>

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, access } = await requirePermission('dashboard.access')
  const visibleNavItems = user.mustChangePassword
    ? navItems.filter((item) => item.href === '/dashboard/account')
    : navItems.filter((item) => !item.permission || access.permissions.includes(item.permission))

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-[var(--line)] bg-[var(--ink)] px-6 py-6 text-white">
        <Link href="/dashboard" className="block">
          <p className="font-mono text-xs tracking-[0.2em] text-white/50 uppercase">ZiftLab</p>
          <p className="mt-2 text-xl font-semibold">Admin</p>
        </Link>
        <nav className="mt-10 grid gap-1">
          {visibleNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-white/72 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-[var(--line)] bg-white/82 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                Dashboard propio
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{user.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/health"
                className="rounded-md border border-[var(--line)] px-3 py-2 font-mono text-xs tracking-[0.12em] text-[var(--muted)] uppercase transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                Health
              </a>
              <form action={logout}>
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
        {children}
      </div>
    </div>
  )
}
