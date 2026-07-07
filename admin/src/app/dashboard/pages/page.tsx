import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/dashboard/ui'
import { PAGE_STATUS_LABELS, PAGE_TYPE_LABELS } from '@/lib/content/types'
import { listPages } from '@/lib/content/queries'
import { requirePermission } from '@/lib/rbac/access'

interface PagesPageProps {
  searchParams?: Promise<{
    q?: string
    status?: string
    type?: string
  }>
}

export default async function PagesPage({ searchParams }: PagesPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('content.read'), searchParams])
  const pages = await listPages(params)
  const canManage = access.permissions.includes('content.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Contenido"
        title="Paginas"
        description="Crea, edita, versiona y publica paginas del sitio desde la DB propia."
        actions={
          canManage && (
            <Link
              href="/dashboard/pages/new"
              className="inline-flex h-11 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
            >
              Crear pagina
            </Link>
          )
        }
      />

      <form className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={params?.q}
          placeholder="Buscar por titulo o slug"
          className="h-10 min-w-64 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
        />
        <select
          name="status"
          defaultValue={params?.status ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(PAGE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={params?.type ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(PAGE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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

      <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr]">
          <span>Pagina</span>
          <span>Tipo</span>
          <span>Estado</span>
          <span>Actualizada</span>
        </div>
        {pages.map((page) => (
          <Link
            key={page.id}
            href={`/dashboard/pages/${page.id}`}
            className="grid gap-3 border-b border-[var(--line)] px-4 py-4 text-sm transition last:border-b-0 hover:bg-[var(--background)] md:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr]"
          >
            <span>
              <span className="block font-semibold">{page.title}</span>
              <span className="text-[var(--muted)]">
                {page.routePath} · {page.slug}
              </span>
            </span>
            <span>{PAGE_TYPE_LABELS[page.type as keyof typeof PAGE_TYPE_LABELS] ?? page.type}</span>
            <span>
              {PAGE_STATUS_LABELS[page.status as keyof typeof PAGE_STATUS_LABELS] ?? page.status}
            </span>
            <time className="text-[var(--muted)]">{page.updatedAt.toLocaleString('es-PA')}</time>
          </Link>
        ))}
        {pages.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No hay paginas"
              message="Crea la primera pagina para empezar a administrar contenido desde el dashboard propio."
              action={
                canManage && (
                  <Link
                    href="/dashboard/pages/new"
                    className="inline-flex h-10 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white"
                  >
                    Crear pagina
                  </Link>
                )
              }
            />
          </div>
        )}
      </section>
    </main>
  )
}
