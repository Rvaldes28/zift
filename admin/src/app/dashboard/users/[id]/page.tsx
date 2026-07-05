import { notFound } from 'next/navigation'

import { resetUserPassword, resetUserTotp, setUserStatus, updateUser } from '@/lib/users/actions'
import { requirePermission } from '@/lib/rbac/access'
import { getUserForEdit, listActivity, listRoles } from '@/lib/users/queries'

interface UserDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    error?: string
    status?: string
  }>
}

export default async function UserDetailPage({ params, searchParams }: UserDetailPageProps) {
  await requirePermission('users.manage')
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [target, roles, activity] = await Promise.all([
    getUserForEdit(id),
    listRoles(),
    listActivity(30),
  ])

  if (!target) notFound()

  const userActivity = activity.filter((entry) => entry.entityId === target.user.id)

  return (
    <main className="px-6 py-8 lg:px-10">
      <section className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">Usuario</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{target.user.name}</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{target.user.email}</p>
      </section>

      {query?.error === 'last-admin' && (
        <p className="mt-6 max-w-3xl rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No puedes quitar o desactivar el ultimo admin activo.
        </p>
      )}
      {query?.status && (
        <p className="mt-6 max-w-3xl rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          action={updateUser}
          className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="userId" value={target.user.id} />
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <input
              name="name"
              defaultValue={target.user.name}
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              defaultValue={target.user.email}
              className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
              required
            />
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Roles</legend>
            <div className="grid gap-2 rounded-md border border-[var(--line)] p-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    name="roleIds"
                    type="checkbox"
                    value={role.id}
                    defaultChecked={target.roleIds.includes(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
          >
            Guardar usuario
          </button>
        </form>

        <aside className="grid gap-4">
          <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
              Estado
            </p>
            <p className="mt-2 text-lg font-semibold">{target.user.status}</p>
            <form action={setUserStatus} className="mt-4">
              <input type="hidden" name="userId" value={target.user.id} />
              <input
                type="hidden"
                name="status"
                value={target.user.status === 'active' ? 'inactive' : 'active'}
              />
              <button
                type="submit"
                className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold"
              >
                {target.user.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
            </form>
          </div>

          <form
            action={resetUserPassword}
            className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="userId" value={target.user.id} />
            <label className="grid gap-2 text-sm font-medium">
              Nueva contrasena temporal
              <input
                name="password"
                type="password"
                minLength={12}
                className="h-10 rounded-md border border-[var(--line)] px-3"
                required
              />
            </label>
            <button
              type="submit"
              className="mt-4 h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
            >
              Resetear contrasena
            </button>
          </form>

          <form
            action={resetUserTotp}
            className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="userId" value={target.user.id} />
            <p className="text-sm text-[var(--muted)]">
              2FA: {target.user.twoFactorEnabled ? 'activo' : 'inactivo'}
            </p>
            <button
              type="submit"
              className="mt-4 h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold"
            >
              Resetear 2FA
            </button>
          </form>
        </aside>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Actividad reciente</h2>
        <div className="mt-4 grid gap-3">
          {userActivity.map((entry) => (
            <div key={entry.id} className="border-b border-[var(--line)] pb-3 text-sm">
              <p className="font-semibold">{entry.action}</p>
              <p className="text-[var(--muted)]">{entry.createdAt.toLocaleString('es-PA')}</p>
            </div>
          ))}
          {userActivity.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Sin actividad registrada todavia.</p>
          )}
        </div>
      </section>
    </main>
  )
}
