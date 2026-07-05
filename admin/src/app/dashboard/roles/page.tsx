import { updateRolePermissions } from '@/lib/users/actions'
import { requirePermission } from '@/lib/rbac/access'
import { PERMISSION_LABELS, type PermissionSlug } from '@/lib/rbac/permissions'
import { getRolePermissionMatrix } from '@/lib/users/queries'

interface RolesPageProps {
  searchParams?: Promise<{
    error?: string
    status?: string
  }>
}

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const [{ access }, params, matrix] = await Promise.all([
    requirePermission('roles.read'),
    searchParams,
    getRolePermissionMatrix(),
  ])
  const canManage = access.permissions.includes('roles.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <section className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">RBAC</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Roles y permisos</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Los permisos se aplican server-side en rutas y acciones. El rol admin esta bloqueado.
        </p>
      </section>

      {params?.error === 'admin-locked' && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          El rol admin no puede perder permisos.
        </p>
      )}
      {params?.status === 'updated' && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Permisos actualizados.
        </p>
      )}

      <section className="mt-8 grid gap-5">
        {matrix.roles.map((role) => {
          const assigned = matrix.permissionIdsByRole.get(role.id) ?? new Set<string>()
          const locked = role.slug === 'admin' || !canManage

          return (
            <form
              key={role.id}
              action={updateRolePermissions}
              className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
            >
              <input type="hidden" name="roleId" value={role.id} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{role.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{role.description}</p>
                </div>
                {role.slug === 'admin' && (
                  <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold">
                    Bloqueado
                  </span>
                )}
              </div>
              <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {matrix.permissions.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 text-sm">
                    <input
                      name="permissionIds"
                      type="checkbox"
                      value={permission.id}
                      defaultChecked={assigned.has(permission.id)}
                      disabled={locked}
                    />
                    {PERMISSION_LABELS[permission.slug as PermissionSlug] ?? permission.slug}
                  </label>
                ))}
              </div>
              {!locked && (
                <button
                  type="submit"
                  className="mt-5 h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
                >
                  Guardar permisos
                </button>
              )}
            </form>
          )
        })}
      </section>
    </main>
  )
}
