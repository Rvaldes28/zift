import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { BLOG_STATUS_LABELS, BLOG_STATUSES, blogStatusLabel } from '@/lib/blog/constants'
import {
  getBlogStats,
  listBlogAuthors,
  listBlogCategories,
  listBlogPosts,
  listBlogTags,
  parseBlogFilters,
  type BlogFilters,
} from '@/lib/blog/queries'
import { requirePermission } from '@/lib/rbac/access'

interface BlogPageProps {
  searchParams?: Promise<BlogFilters & { error?: string; status?: string }>
}

function dateLabel(date: Date | null): string {
  if (!date) return 'Sin fecha'

  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
  }).format(date)
}

function statusClasses(status: string): string {
  const tone: Record<string, string> = {
    archived: 'bg-slate-100 text-slate-700',
    draft: 'bg-amber-50 text-amber-700',
    published: 'bg-emerald-50 text-emerald-700',
    scheduled: 'bg-blue-50 text-blue-700',
  }

  return `rounded-full px-2.5 py-1 text-xs font-semibold ${tone[status] ?? 'bg-slate-100 text-slate-700'}`
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('content.read'), searchParams])
  const filters = parseBlogFilters(params)
  const [posts, stats, categories, tags, authors] = await Promise.all([
    listBlogPosts(filters),
    getBlogStats(filters),
    listBlogCategories(),
    listBlogTags(),
    listBlogAuthors(),
  ])
  const canManage = access.permissions.includes('content.manage')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Contenido"
        title="Blog"
        description="Administra articulos, categorias, tags, autores y publicacion editorial desde la DB propia."
        actions={
          <>
            <Link
              href="/dashboard/blog/categories"
              className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
            >
              Categorias
            </Link>
            <Link
              href="/dashboard/blog/tags"
              className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]"
            >
              Tags
            </Link>
            {canManage && (
              <Link
                href="/dashboard/blog/new"
                className="inline-flex h-11 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
              >
                Crear articulo
              </Link>
            )}
          </>
        }
      />

      {params?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar.
        </p>
      )}
      {params?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <StatCard label="Total" value={String(stats.total)} helper="Articulos administrables." />
        <StatCard label="Borradores" value={String(stats.draft)} helper="Pendientes de publicar." />
        <StatCard label="Publicados" value={String(stats.published)} helper="Visibles en Astro." />
        <StatCard label="Programados" value={String(stats.scheduled)} helper="Con fecha futura." />
        <StatCard label="Archivados" value={String(stats.archived)} helper="Fuera del sitio." />
      </section>

      <form className="mt-8 grid gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))_auto]">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Buscar titulo, slug o extracto"
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {BLOG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {BLOG_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          name="categoryId"
          defaultValue={filters.categoryId ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
        <select
          name="tagId"
          defaultValue={filters.tagId ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.title}
            </option>
          ))}
        </select>
        <select
          name="authorId"
          defaultValue={filters.authorId ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los autores</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}
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
        <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--background)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr]">
          <span>Articulo</span>
          <span>Taxonomia</span>
          <span>Autor</span>
          <span>Estado</span>
          <span>Fecha</span>
        </div>
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/dashboard/blog/${post.id}`}
            className="grid gap-3 border-b border-[var(--line)] px-4 py-4 text-sm transition last:border-b-0 hover:bg-[var(--background)] lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr]"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{post.title}</span>
              <span className="block truncate text-[var(--muted)]">/blog/{post.slug}</span>
              <span className="mt-1 line-clamp-2 text-[var(--muted)]">{post.excerpt}</span>
            </span>
            <span className="min-w-0 text-[var(--muted)]">
              <span className="block truncate">
                {post.categories.map((category) => category.title).join(', ') || 'Sin categoria'}
              </span>
              <span className="block truncate">
                {post.tags.map((tag) => `#${tag.title}`).join(', ') || 'Sin tags'}
              </span>
            </span>
            <span className="text-[var(--muted)]">
              {post.authorName ?? post.authorEmail ?? 'Sin autor'}
            </span>
            <span>
              <span className={statusClasses(post.status)}>{blogStatusLabel(post.status)}</span>
            </span>
            <span className="text-[var(--muted)]">
              {post.status === 'scheduled'
                ? dateLabel(post.scheduledAt)
                : dateLabel(post.publishedAt ?? post.updatedAt)}
            </span>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No hay articulos"
              message="Crea el primer borrador para empezar a gestionar el blog desde el dashboard propio."
              action={
                canManage && (
                  <Link
                    href="/dashboard/blog/new"
                    className="inline-flex h-10 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white"
                  >
                    Crear articulo
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
