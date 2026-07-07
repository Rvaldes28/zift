import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/dashboard/ui'
import { requirePermission } from '@/lib/rbac/access'
import { listRoles, listUsers } from '@/lib/users/queries'

interface UsersPageProps {
  searchParams?: Promise<{
    q?: string
    role?: string
    status?: string
    error?: string
  }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { access } = await requirePermission('users.read')
  const params = await searchParams
  const [users, roles] = await Promise.all([
    listUsers({ search: params?.q, role: params?.role, status: params?.status }),
    listRoles(),
  ])

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Accesos"
        title="Usuarios"
        description="Administra cuentas del dashboard, estados, roles y 2FA."
        actions={
          access.permissions.includes('users.manage') && (
            <Link
              href="/dashboard/users/new"
              className="inline-flex h-11 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
            >
              Crear usuario
            </Link>
          )
        }
      />

      <form className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={params?.q}
          placeholder="Buscar por nombre o email"
          className="h-10 min-w-64 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
        />
        <select
          name="status"
          defaultValue={params?.status ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="pending">Pendientes</option>
        </select>
        <select
          name="role"
          defaultValue={params?.role ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.slug}>
              {role.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      {params?.error === 'invalid' && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar.
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr] border-b border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          <span>Usuario</span>
          <span>Roles</span>
          <span>Estado</span>
          <span>2FA</span>
        </div>
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/dashboard/users/${user.id}`}
            className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr] border-b border-[var(--line)] px-4 py-4 text-sm transition hover:bg-[var(--background)]"
          >
            <span>
              <span className="block font-semibold">{user.name}</span>
              <span className="text-[var(--muted)]">{user.email}</span>
            </span>
            <span className="text-[var(--muted)]">{user.roles.join(', ') || 'Sin rol'}</span>
            <span>{user.status}</span>
            <span>{user.twoFactorEnabled ? 'Activo' : 'No'}</span>
          </Link>
        ))}
        {users.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No hay usuarios para ese filtro"
              message="Ajusta la busqueda o limpia los filtros para ver otras cuentas."
            />
          </div>
        )}
      </section>
    </main>
  )
}
