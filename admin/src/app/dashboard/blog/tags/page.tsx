import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { deleteTag, saveTag } from '@/lib/blog/actions'
import { listBlogTags } from '@/lib/blog/queries'
import { requirePermission } from '@/lib/rbac/access'

interface BlogTagsPageProps {
  searchParams?: Promise<{
    error?: string
    status?: string
  }>
}

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

export default async function BlogTagsPage({ searchParams }: BlogTagsPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('content.read'), searchParams])
  const tags = await listBlogTags()
  const canManage = access.permissions.includes('content.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Blog"
        title="Tags"
        description="Etiquetas editoriales para agrupar temas, campañas y clusters de contenido."
        actions={
          <Link
            href="/dashboard/blog"
            className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
          >
            Volver al blog
          </Link>
        }
      />

      {params?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo guardar. Revisa que el slug no este duplicado.
        </p>
      )}
      {params?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      {canManage && (
        <form
          action={saveTag}
          className="mt-8 grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]"
        >
          <CsrfField />
          <label className="grid gap-2 text-sm font-medium">
            Titulo
            <input name="title" className={inputClass()} required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <input name="slug" className={inputClass()} />
          </label>
          <button className="mt-7 h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
            Crear
          </button>
        </form>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase md:grid-cols-[1fr_1fr_120px_120px]">
          <span>Tag</span>
          <span>Slug</span>
          <span>Articulos</span>
          <span>Accion</span>
        </div>
        {tags.map((tag) => (
          <article
            key={tag.id}
            className="grid gap-3 border-b border-[var(--line)] px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_120px_120px]"
          >
            <form action={saveTag} className="contents">
              <CsrfField />
              <input type="hidden" name="tagId" value={tag.id} />
              <input
                name="title"
                defaultValue={tag.title}
                disabled={!canManage}
                className={inputClass()}
                required
              />
              <input
                name="slug"
                defaultValue={tag.slug}
                disabled={!canManage}
                className={inputClass()}
                required
              />
              <span className="self-center text-[var(--muted)]">{tag.postCount}</span>
              {canManage ? (
                <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                  Guardar
                </button>
              ) : (
                <span />
              )}
            </form>
            {canManage && (
              <form action={deleteTag} className="md:col-start-4">
                <CsrfField />
                <input type="hidden" name="tagId" value={tag.id} />
                <button className="text-sm font-semibold text-red-700">Eliminar</button>
              </form>
            )}
          </article>
        ))}
        {tags.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="Sin tags"
              message="Crea tags para organizar temas editoriales y campañas."
            />
          </div>
        )}
      </section>
    </main>
  )
}
