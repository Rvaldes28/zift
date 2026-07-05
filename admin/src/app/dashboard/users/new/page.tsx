import { createUser } from '@/lib/users/actions'
import { requirePermission } from '@/lib/rbac/access'
import { listRoles } from '@/lib/users/queries'

interface NewUserPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function NewUserPage({ searchParams }: NewUserPageProps) {
  await requirePermission('users.manage')
  const params = await searchParams
  const roles = await listRoles()

  return (
    <main className="px-6 py-8 lg:px-10">
      <section className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
          Usuarios
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Crear usuario</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          La contrasena temporal obliga al usuario a cambiarla en su primer acceso.
        </p>
      </section>

      <form
        action={createUser}
        className="mt-8 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
      >
        <label className="grid gap-2 text-sm font-medium">
          Nombre
          <input
            name="name"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Contrasena temporal
          <input
            name="password"
            type="password"
            minLength={12}
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Roles</legend>
          <div className="grid gap-2 rounded-md border border-[var(--line)] p-3">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <input name="roleIds" type="checkbox" value={role.id} />
                {role.name}
              </label>
            ))}
          </div>
        </fieldset>
        {params?.error === 'invalid' && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Completa los datos y asigna al menos un rol.
          </p>
        )}
        <button
          type="submit"
          className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
        >
          Crear usuario
        </button>
      </form>
    </main>
  )
}
