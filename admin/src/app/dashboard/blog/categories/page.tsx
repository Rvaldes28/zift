import Link from 'next/link'

import { EmptyState, PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { deleteCategory, saveCategory } from '@/lib/blog/actions'
import { listBlogCategories } from '@/lib/blog/queries'
import { requirePermission } from '@/lib/rbac/access'

interface BlogCategoriesPageProps {
  searchParams?: Promise<{
    error?: string
    status?: string
  }>
}

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

function textareaClass() {
  return 'min-h-20 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]'
}

export default async function BlogCategoriesPage({ searchParams }: BlogCategoriesPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('content.read'), searchParams])
  const categories = await listBlogCategories()
  const canManage = access.permissions.includes('content.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Blog"
        title="Categorias"
        description="Taxonomia principal para rutas, filtros editoriales y autoridad SEO del blog."
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
          action={saveCategory}
          className="mt-8 grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_1.6fr_auto]"
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
          <label className="grid gap-2 text-sm font-medium">
            Descripcion
            <textarea name="description" className={textareaClass()} />
          </label>
          <button className="mt-7 h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
            Crear
          </button>
        </form>
      )}

      <section className="mt-6 grid gap-4">
        {categories.map((category) => (
          <article
            key={category.id}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
          >
            <form action={saveCategory} className="grid gap-4 lg:grid-cols-[1fr_1fr_1.6fr_auto]">
              <CsrfField />
              <input type="hidden" name="categoryId" value={category.id} />
              <label className="grid gap-2 text-sm font-medium">
                Titulo
                <input
                  name="title"
                  defaultValue={category.title}
                  disabled={!canManage}
                  className={inputClass()}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <input
                  name="slug"
                  defaultValue={category.slug}
                  disabled={!canManage}
                  className={inputClass()}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Descripcion
                <textarea
                  name="description"
                  defaultValue={category.description ?? ''}
                  disabled={!canManage}
                  className={textareaClass()}
                />
              </label>
              {canManage && (
                <button className="mt-7 h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                  Guardar
                </button>
              )}
            </form>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
              <span>{category.postCount} articulos</span>
              {canManage && (
                <form action={deleteCategory}>
                  <CsrfField />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <button className="font-semibold text-red-700">Eliminar</button>
                </form>
              )}
            </div>
          </article>
        ))}
        {categories.length === 0 && (
          <EmptyState
            title="Sin categorias"
            message="Crea categorias para organizar el blog y habilitar rutas por tema."
          />
        )}
      </section>
    </main>
  )
}
