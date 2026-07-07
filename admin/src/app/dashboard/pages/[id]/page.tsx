import { notFound } from 'next/navigation'

import { PagePreview } from '@/components/content/page-preview'
import { SectionEditor } from '@/components/content/section-editor'
import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  addSection,
  archivePage,
  deletePage,
  publishPage,
  restoreVersion,
  schedulePage,
  unpublishPage,
  updatePageDetails,
  updatePageSeo,
} from '@/lib/content/actions'
import { getPageEditor } from '@/lib/content/queries'
import {
  PAGE_STATUS_LABELS,
  PAGE_TYPE_LABELS,
  SECTION_KIND_LABELS,
  SECTION_KINDS,
} from '@/lib/content/types'
import { uploadMedia } from '@/lib/media/actions'
import { requirePermission } from '@/lib/rbac/access'

interface PageDetailProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    error?: string
    status?: string
    tab?: string
  }>
}

const tabs = [
  { id: 'content', label: 'Contenido' },
  { id: 'sections', label: 'Secciones' },
  { id: 'seo', label: 'SEO' },
  { id: 'preview', label: 'Preview' },
  { id: 'history', label: 'Historial' },
]

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

function textareaClass() {
  return 'min-h-24 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]'
}

function dateTimeValue(value: Date | null) {
  if (!value) return ''
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default async function PageDetail({ params, searchParams }: PageDetailProps) {
  const [{ id }, query, { access }] = await Promise.all([
    params,
    searchParams,
    requirePermission('content.read'),
  ])
  const data = await getPageEditor(id)
  if (!data) notFound()

  const tab = tabs.some((item) => item.id === query?.tab) ? query?.tab : 'content'
  const canManage = access.permissions.includes('content.manage')
  const canManageSeo = access.permissions.includes('seo.manage')
  const canManageMedia = access.permissions.includes('media.manage')
  const pageStatus =
    PAGE_STATUS_LABELS[data.page.status as keyof typeof PAGE_STATUS_LABELS] ?? data.page.status

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Pagina"
        title={data.page.title}
        description={`${data.page.routePath} · ${pageStatus}`}
      />

      {query?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar.
        </p>
      )}
      {query?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Estado" value={pageStatus} />
        <StatCard
          label="Tipo"
          value={
            PAGE_TYPE_LABELS[data.page.type as keyof typeof PAGE_TYPE_LABELS] ?? data.page.type
          }
        />
        <StatCard label="Secciones" value={String(data.sections.length)} />
        <StatCard label="Versiones" value={String(data.versions.length)} />
      </section>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-[var(--line)]">
        {tabs.map((item) => (
          <a
            key={item.id}
            href={`/dashboard/pages/${data.page.id}?tab=${item.id}`}
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
            action={updatePageDetails}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
          >
            <CsrfField />
            <input type="hidden" name="pageId" value={data.page.id} />
            <label className="grid gap-2 text-sm font-medium">
              Tipo
              <select
                name="type"
                defaultValue={data.page.type}
                disabled={!canManage}
                className={inputClass()}
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
                defaultValue={data.page.title}
                disabled={!canManage}
                className={inputClass()}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Slug
              <input
                name="slug"
                defaultValue={data.page.slug}
                disabled={!canManage}
                className={inputClass()}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Extracto
              <textarea
                name="excerpt"
                defaultValue={data.page.excerpt ?? ''}
                disabled={!canManage}
                className={textareaClass()}
              />
            </label>
            {canManage && (
              <button
                type="submit"
                className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
              >
                Guardar draft
              </button>
            )}
          </form>

          <aside className="grid h-fit gap-3 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Publicacion</h2>
            {canManage && (
              <>
                <form action={publishPage}>
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <button className="h-10 w-full rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white">
                    Publicar ahora
                  </button>
                </form>
                <form action={schedulePage} className="grid gap-2">
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    defaultValue={dateTimeValue(data.page.scheduledAt)}
                    className={inputClass()}
                    required
                  />
                  <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                    Programar
                  </button>
                </form>
                <form action={unpublishPage}>
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <button className="h-10 w-full rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                    Despublicar
                  </button>
                </form>
                <form action={archivePage}>
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <button className="h-10 w-full rounded-md border border-amber-200 px-4 text-sm font-semibold text-amber-800">
                    Archivar
                  </button>
                </form>
                <form action={deletePage}>
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <button className="h-10 w-full rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700">
                    Eliminar
                  </button>
                </form>
              </>
            )}
          </aside>
        </section>
      )}

      {tab === 'sections' && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-5">
            {data.sections.map((section) => (
              <SectionEditor
                key={section.id}
                media={data.media}
                pageId={data.page.id}
                section={section}
              />
            ))}
            {data.sections.length === 0 && (
              <EmptyState
                title="Sin secciones"
                message="Agrega el primer bloque flexible para construir esta pagina."
              />
            )}
          </div>

          <aside className="grid h-fit gap-5">
            {canManage && (
              <form
                action={addSection}
                className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
              >
                <CsrfField />
                <input type="hidden" name="pageId" value={data.page.id} />
                <h2 className="text-lg font-semibold">Agregar bloque</h2>
                <label className="grid gap-2 text-sm font-medium">
                  Tipo
                  <select name="kind" className={inputClass()}>
                    {SECTION_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {SECTION_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Etiqueta
                  <input name="label" className={inputClass()} />
                </label>
                <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                  Agregar
                </button>
              </form>
            )}

            {canManageMedia && (
              <form
                action={uploadMedia}
                className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
              >
                <CsrfField />
                <input type="hidden" name="pageId" value={data.page.id} />
                <h2 className="text-lg font-semibold">Subir media</h2>
                <input name="file" type="file" accept="image/*,application/pdf" required />
                <label className="grid gap-2 text-sm font-medium">
                  Alt
                  <input name="alt" className={inputClass()} required />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Caption
                  <input name="caption" className={inputClass()} />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Carpeta
                  <input name="folderPath" placeholder="/paginas" className={inputClass()} />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Tags
                  <input name="tags" placeholder="home, banner" className={inputClass()} />
                </label>
                <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                  Subir
                </button>
              </form>
            )}
          </aside>
        </section>
      )}

      {tab === 'seo' && (
        <section className="mt-8 max-w-3xl">
          <form
            action={updatePageSeo}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
          >
            <CsrfField />
            <input type="hidden" name="pageId" value={data.page.id} />
            <label className="grid gap-2 text-sm font-medium">
              Meta title
              <input
                name="title"
                defaultValue={data.seo?.title ?? ''}
                disabled={!canManageSeo}
                className={inputClass()}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Meta description
              <textarea
                name="description"
                defaultValue={data.seo?.description ?? ''}
                disabled={!canManageSeo}
                className={textareaClass()}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Imagen OG
              <select
                name="imageId"
                defaultValue={data.seo?.imageId ?? ''}
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
              Canonical URL
              <input
                name="canonicalUrl"
                defaultValue={data.seo?.canonicalUrl ?? ''}
                disabled={!canManageSeo}
                className={inputClass()}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="noindex" type="checkbox" defaultChecked={data.seo?.noindex ?? false} />
              No indexar
            </label>
            {canManageSeo && (
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                Guardar SEO
              </button>
            )}
          </form>
        </section>
      )}

      {tab === 'preview' && (
        <div className="mt-8">
          <PagePreview media={data.media} sections={data.sections} />
        </div>
      )}

      {tab === 'history' && (
        <section className="mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
          {data.versions.map((version) => (
            <article
              key={version.id}
              className="grid gap-3 border-b border-[var(--line)] px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_180px_140px]"
            >
              <div>
                <p className="font-semibold">Version {version.version}</p>
                <p className="text-[var(--muted)]">{version.id}</p>
              </div>
              <time className="text-[var(--muted)]">
                {version.createdAt.toLocaleString('es-PA')}
              </time>
              {canManage && (
                <form action={restoreVersion}>
                  <CsrfField />
                  <input type="hidden" name="pageId" value={data.page.id} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <button className="h-10 rounded-md border border-[var(--line)] px-3 text-sm font-semibold">
                    Restaurar
                  </button>
                </form>
              )}
            </article>
          ))}
          {data.versions.length === 0 && (
            <div className="p-4">
              <EmptyState
                title="Sin versiones"
                message="Cada guardado creara un snapshot para restaurar despues."
              />
            </div>
          )}
        </section>
      )}
    </main>
  )
}
