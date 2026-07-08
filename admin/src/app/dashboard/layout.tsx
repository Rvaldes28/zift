import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getVisibleDashboardNavGroups } from '@/lib/dashboard/navigation'
import { getHeaderNotificationBadge } from '@/lib/notifications/queries'
import { requirePermission } from '@/lib/rbac/access'
import { createCsrfToken } from '@/lib/security/csrf'
import { requiresTwoFactorSetup } from '@/lib/security/two-factor-policy'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, access } = await requirePermission('dashboard.access')
  const csrfToken = await createCsrfToken()
  const notificationBadge = await getHeaderNotificationBadge()
  const limitedToAccount = user.mustChangePassword || requiresTwoFactorSetup(user, access)
  const navGroups = limitedToAccount
    ? [
        {
          label: 'Cuenta',
          items: [
            {
              id: 'account',
              label: 'Cuenta',
              href: '/dashboard/account',
              description: 'Cambiar contrasena temporal y seguridad personal.',
            },
          ],
        },
      ]
    : getVisibleDashboardNavGroups(access.permissions)

  return (
    <DashboardShell
      csrfToken={csrfToken}
      navGroups={navGroups}
      notificationBadge={notificationBadge}
      user={{
        email: user.email,
        mustChangePassword: user.mustChangePassword,
        name: user.name,
      }}
    >
      {children}
    </DashboardShell>
  )
}
