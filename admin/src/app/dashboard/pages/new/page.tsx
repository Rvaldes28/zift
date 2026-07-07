import { PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { createPage } from '@/lib/content/actions'
import { PAGE_TYPE_LABELS } from '@/lib/content/types'
import { requirePermission } from '@/lib/rbac/access'

interface NewPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function NewPage({ searchParams }: NewPageProps) {
  await requirePermission('content.manage')
  const params = await searchParams

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Contenido"
        title="Crear pagina"
        description="Crea un borrador inicial. Luego podras agregar secciones, SEO, preview y publicar."
      />

      <form
        action={createPage}
        className="mt-8 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
      >
        <CsrfField />
        <label className="grid gap-2 text-sm font-medium">
          Tipo
          <select
            name="type"
            defaultValue="page"
            className="h-11 rounded-md border border-[var(--line)] px-3 text-sm"
          >
            {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Titulo
          <input
            name="title"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input
            name="slug"
            placeholder="se genera desde el titulo si lo dejas vacio"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Extracto
          <textarea
            name="excerpt"
            className="min-h-28 rounded-md border border-[var(--line)] px-3 py-2 outline-none transition focus:border-[var(--zift)]"
          />
        </label>
        {params?.error === 'invalid' && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Revisa los datos. El titulo es obligatorio y el slug debe ser valido.
          </p>
        )}
        <button
          type="submit"
          className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
        >
          Crear borrador
        </button>
      </form>
    </main>
  )
}
