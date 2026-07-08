import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  archivePost,
  deletePost,
  publishPost,
  schedulePost,
  unpublishPost,
  updatePostDetails,
  updatePostSeo,
} from '@/lib/blog/actions'
import { blogStatusLabel } from '@/lib/blog/constants'
import { getBlogPostEditor } from '@/lib/blog/queries'
import { requirePermission } from '@/lib/rbac/access'
import { sanitizeHtml } from '@/lib/security/sanitize-html'

interface PostDetailProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    error?: string
    status?: string
    tab?: string
  }>
}

const tabs = [
  { id: 'content', label: 'Contenido' },
  { id: 'seo', label: 'SEO' },
  { id: 'preview', label: 'Preview' },
]

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

function textareaClass() {
  return 'min-h-28 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]'
}

function multiSelectClass() {
  return 'min-h-32 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]'
}

function dateTimeValue(value: Date | null) {
  if (!value) return ''
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function htmlFromContent(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content !== 'object') return ''

  const record = content as Record<string, unknown>
  if (typeof record.html === 'string') return record.html
  if (typeof record.text === 'string') return record.text

  return ''
}

function schemaValue(value: unknown): string {
  if (!value) return ''

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export default async function PostDetail({ params, searchParams }: PostDetailProps) {
  const [{ id }, query, { access }] = await Promise.all([
    params,
    searchParams,
    requirePermission('content.read'),
  ])
  const data = await getBlogPostEditor(id)
  if (!data) notFound()

  const tab = tabs.some((item) => item.id === query?.tab) ? query?.tab : 'content'
  const canManage = access.permissions.includes('content.manage')
  const canManageSeo = access.permissions.includes('seo.manage')
  const contentHtml = htmlFromContent(data.post.content)
  const safeContentHtml = sanitizeHtml(contentHtml)
  const selectedCategorySet = new Set(data.selectedCategoryIds)
  const selectedTagSet = new Set(data.selectedTagIds)
  const relatedSet = new Set(data.relatedPostIds)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Articulo"
        title={data.post.title}
        description={`/blog/${data.post.slug} · ${blogStatusLabel(data.post.status)}`}
        actions={
          <>
            <Link
              href="/dashboard/blog"
              className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
            >
              Volver
            </Link>
            <a
              href={`/blog/${data.post.slug}`}
              target="_blank"
              className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
            >
              Ver URL
            </a>
          </>
        }
      />

      {query?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar. Revisa duplicados, longitudes o JSON-LD.
        </p>
      )}
      {query?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Estado" value={blogStatusLabel(data.post.status)} />
        <StatCard
          label="Publicacion"
          value={
            data.post.scheduledAt
              ? data.post.scheduledAt.toLocaleDateString('es-PA')
              : (data.post.publishedAt?.toLocaleDateString('es-PA') ?? 'Sin fecha')
          }
        />
        <StatCard label="Categorias" value={String(data.selectedCategoryIds.length)} />
        <StatCard label="SEO" value={data.seo?.title ? 'Configurado' : 'Basico'} />
      </section>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-[var(--line)]">
        {tabs.map((item) => (
          <a
            key={item.id}
            href={`/dashboard/blog/${data.post.id}?tab=${item.id}`}
            className={`border-b-2 px-3 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? 'border-[var(--zift)] text-[var(--ink)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {tab === 'content' && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <form
            action={updatePostDetails}
            className="grid gap-5 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
          >
            <CsrfField />
            <input type="hidden" name="postId" value={data.post.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Titulo
                <input
                  name="title"
                  defaultValue={data.post.title}
                  disabled={!canManage}
                  className={inputClass()}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <input
                  name="slug"
                  defaultValue={data.post.slug}
                  disabled={!canManage}
                  className={inputClass()}
                  required
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Extracto
              <textarea
                name="excerpt"
                defaultValue={data.post.excerpt}
                disabled={!canManage}
                className={textareaClass()}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Contenido HTML / rich text simple
              <textarea
                name="contentHtml"
                defaultValue={contentHtml}
                disabled={!canManage}
                className="min-h-72 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm outline-none transition focus:border-[var(--zift)]"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Autor
                <select
                  name="authorId"
                  defaultValue={data.post.authorId ?? ''}
                  disabled={!canManage}
                  className={inputClass()}
                >
                  <option value="">Sin autor</option>
                  {data.authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Imagen destacada
                <select
                  name="coverImageId"
                  defaultValue={data.post.coverImageId ?? ''}
                  disabled={!canManage}
                  className={inputClass()}
                >
                  <option value="">Sin imagen</option>
                  {data.media.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.alt || asset.filename}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Categorias
                <select
                  name="categoryIds"
                  multiple
                  defaultValue={data.selectedCategoryIds}
                  disabled={!canManage}
                  className={multiSelectClass()}
                >
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Tags
                <select
                  name="tagIds"
                  multiple
                  defaultValue={data.selectedTagIds}
                  disabled={!canManage}
                  className={multiSelectClass()}
                >
                  {data.tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Relacionados
                <select
                  name="relatedPostIds"
                  multiple
                  defaultValue={data.relatedPostIds}
                  disabled={!canManage}
                  className={multiSelectClass()}
                >
                  {data.postOptions.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]">
                Guardar articulo
              </button>
            )}
          </form>

          <aside className="grid h-fit gap-3 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Publicacion</h2>
            {canManage ? (
              <>
                <form action={publishPost}>
                  <CsrfField />
                  <input type="hidden" name="postId" value={data.post.id} />
                  <button className="h-10 w-full rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
                    Publicar ahora
                  </button>
                </form>
                <form action={schedulePost} className="grid gap-2">
                  <CsrfField />
                  <input type="hidden" name="postId" value={data.post.id} />
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    defaultValue={dateTimeValue(data.post.scheduledAt)}
                    className={inputClass()}
                    required
                  />
                  <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                    Programar
                  </button>
                </form>
                <form action={unpublishPost}>
                  <CsrfField />
                  <input type="hidden" name="postId" value={data.post.id} />
                  <button className="h-10 w-full rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                    Despublicar
                  </button>
                </form>
                <form action={archivePost}>
                  <CsrfField />
                  <input type="hidden" name="postId" value={data.post.id} />
                  <button className="h-10 w-full rounded-md border border-amber-200 px-4 text-sm font-semibold text-amber-800">
                    Archivar
                  </button>
                </form>
                <form action={deletePost}>
                  <CsrfField />
                  <input type="hidden" name="postId" value={data.post.id} />
                  <button className="h-10 w-full rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700">
                    Eliminar
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">No tienes permiso para publicar.</p>
            )}
            <div className="border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
              <p>Categorias: {data.selectedCategoryIds.length}</p>
              <p>Tags: {data.selectedTagIds.length}</p>
              <p>Relacionados: {data.relatedPostIds.length}</p>
            </div>
          </aside>
        </section>
      )}

      {tab === 'seo' && (
        <section className="mt-8 max-w-4xl">
          <form
            action={updatePostSeo}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
          >
            <CsrfField />
            <input type="hidden" name="postId" value={data.post.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Meta title
                <input
                  name="title"
                  defaultValue={data.seo?.title ?? data.post.title}
                  disabled={!canManageSeo}
                  maxLength={70}
                  className={inputClass()}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Canonical URL
                <input
                  name="canonicalUrl"
                  defaultValue={data.seo?.canonicalUrl ?? ''}
                  disabled={!canManageSeo}
                  className={inputClass()}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Meta description
              <textarea
                name="description"
                defaultValue={data.seo?.description ?? data.post.excerpt}
                disabled={!canManageSeo}
                maxLength={180}
                className={textareaClass()}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Open Graph title
                <input
                  name="ogTitle"
                  defaultValue={data.seo?.ogTitle ?? ''}
                  disabled={!canManageSeo}
                  maxLength={95}
                  className={inputClass()}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Imagen destacada SEO
                <select
                  name="imageId"
                  defaultValue={data.seo?.imageId ?? data.post.coverImageId ?? ''}
                  disabled={!canManageSeo}
                  className={inputClass()}
                >
                  <option value="">Sin imagen</option>
                  {data.media.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.alt || asset.filename}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Open Graph description
              <textarea
                name="ogDescription"
                defaultValue={data.seo?.ogDescription ?? ''}
                disabled={!canManageSeo}
                maxLength={200}
                className={textareaClass()}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Open Graph image
              <select
                name="ogImageId"
                defaultValue={
                  data.seo?.ogImageId ?? data.seo?.imageId ?? data.post.coverImageId ?? ''
                }
                disabled={!canManageSeo}
                className={inputClass()}
              >
                <option value="">Sin imagen</option>
                {data.media.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.alt || asset.filename}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Schema JSON-LD adicional
              <textarea
                name="schemaJsonLd"
                defaultValue={schemaValue(data.seo?.schemaJsonLd)}
                disabled={!canManageSeo}
                className="min-h-48 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm outline-none transition focus:border-[var(--zift)]"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Robots directives
                <input
                  name="robotsDirectives"
                  defaultValue={(data.seo?.robotsDirectives ?? ['index', 'follow']).join(', ')}
                  disabled={!canManageSeo}
                  className={inputClass()}
                />
              </label>
              <div className="grid gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    name="noindex"
                    type="checkbox"
                    defaultChecked={data.seo?.noindex ?? false}
                    disabled={!canManageSeo}
                  />
                  No indexar
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="sitemapInclude"
                    type="checkbox"
                    defaultChecked={data.seo?.sitemapInclude ?? true}
                    disabled={!canManageSeo}
                  />
                  Incluir en sitemap
                </label>
              </div>
            </div>
            {canManageSeo && (
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                Guardar SEO
              </button>
            )}
          </form>
        </section>
      )}

      {tab === 'preview' && (
        <section className="mt-8 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
          <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
            Preview interno
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{data.post.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            {data.post.excerpt}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.categories
              .filter((category) => selectedCategorySet.has(category.id))
              .map((category) => (
                <span
                  key={category.id}
                  className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold"
                >
                  {category.title}
                </span>
              ))}
            {data.tags
              .filter((tag) => selectedTagSet.has(tag.id))
              .map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted)]"
                >
                  #{tag.title}
                </span>
              ))}
          </div>
          {contentHtml ? (
            <article
              className="mt-8 max-w-none text-sm leading-7"
              dangerouslySetInnerHTML={{ __html: safeContentHtml }}
            />
          ) : (
            <EmptyState
              title="Sin contenido"
              message="Guarda contenido en el editor para previsualizar el articulo."
            />
          )}
          {data.postOptions.some((post) => relatedSet.has(post.id)) && (
            <section className="mt-10 border-t border-[var(--line)] pt-6">
              <h3 className="text-lg font-semibold">Relacionados</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.postOptions
                  .filter((post) => relatedSet.has(post.id))
                  .map((post) => (
                    <article key={post.id} className="rounded-md border border-[var(--line)] p-4">
                      <p className="font-semibold">{post.title}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">/blog/{post.slug}</p>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </section>
      )}
    </main>
  )
}
