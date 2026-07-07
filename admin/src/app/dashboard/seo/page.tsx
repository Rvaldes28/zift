import Image from 'next/image'
import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  deleteRedirect,
  ensureNotFoundPage,
  saveRedirect,
  saveSeoEntity,
  updateRobotsRules,
} from '@/lib/seo/actions'
import {
  getGlobalRobotsRules,
  getSeoEntity,
  listPublicSeoRoutes,
  listRedirects,
  listSeoEntities,
  listSeoMediaOptions,
  type SeoEntityDetail,
} from '@/lib/seo/queries'
import { SEO_ENTITY_PLURAL_LABELS, SEO_ENTITY_TYPES, type SeoEntityType } from '@/lib/seo/types'
import { requirePermission } from '@/lib/rbac/access'

interface SeoPageProps {
  searchParams?: Promise<{
    entity?: string
    error?: string
    q?: string
    status?: string
    tab?: string
  }>
}

const tabs = [
  { id: 'page', label: 'Paginas' },
  { id: 'service', label: 'Servicios' },
  { id: 'project', label: 'Proyectos' },
  { id: 'post', label: 'Blog' },
  { id: 'redirects', label: 'Redirects' },
  { id: 'sitemap', label: 'Sitemap' },
  { id: 'robots', label: 'Robots' },
  { id: '404', label: '404' },
] as const

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)] disabled:bg-[var(--background)] disabled:text-[var(--muted)]'
}

function textareaClass() {
  return 'min-h-24 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)] disabled:bg-[var(--background)] disabled:text-[var(--muted)]'
}

function entityTab(value?: string): SeoEntityType | null {
  return SEO_ENTITY_TYPES.includes(value as SeoEntityType) ? (value as SeoEntityType) : null
}

function lengthHint(value: string | null, min: number, max: number) {
  const length = value?.length ?? 0
  const tone =
    length > max
      ? 'text-red-700'
      : length >= min && length <= max
        ? 'text-emerald-700'
        : 'text-[var(--muted)]'

  return (
    <span className={`text-xs ${tone}`}>
      {length}/{max}
    </span>
  )
}

function selectedMediaUrl(
  media: Awaited<ReturnType<typeof listSeoMediaOptions>>,
  id: string | null,
) {
  return media.find((asset) => asset.id === id)?.url ?? null
}

function mediaSelect({
  defaultValue,
  disabled,
  media,
  name,
}: {
  defaultValue: string | null
  disabled: boolean
  media: Awaited<ReturnType<typeof listSeoMediaOptions>>
  name: string
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      disabled={disabled}
      className={inputClass()}
    >
      <option value="">Sin imagen</option>
      {media.map((asset) => (
        <option key={asset.id} value={asset.id}>
          {asset.alt || asset.filename}
        </option>
      ))}
    </select>
  )
}

function SeoEditor({
  canManage,
  detail,
  media,
}: {
  canManage: boolean
  detail: SeoEntityDetail
  media: Awaited<ReturnType<typeof listSeoMediaOptions>>
}) {
  const readOnlySlug =
    detail.entityType === 'page' &&
    ['home', 'about', 'contact', 'not_found'].includes(detail.subtype ?? '')
  const robots = detail.robotsDirectives.length
    ? detail.robotsDirectives.join('\n')
    : detail.noindex
      ? 'noindex\nnofollow'
      : 'index\nfollow\nmax-image-preview:large'
  const schemaJson = detail.schemaJsonLd ? JSON.stringify(detail.schemaJsonLd, null, 2) : ''
  const ogImage = selectedMediaUrl(media, detail.ogImageId ?? detail.imageId)
  const previewTitle = detail.title || detail.slug
  const previewDescription = detail.description || detail.excerpt || 'Descripcion pendiente.'
  const disabled = !canManage

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form
        action={saveSeoEntity}
        className="grid gap-5 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
      >
        <CsrfField />
        <input type="hidden" name="entityType" value={detail.entityType} />
        <input type="hidden" name="entityId" value={detail.id} />

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <label className="grid gap-2 text-sm font-medium">
            Slug / URL
            <input
              name="slug"
              defaultValue={detail.slug}
              className={inputClass()}
              readOnly={readOnlySlug}
              disabled={disabled}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              name="createRedirect"
              type="checkbox"
              defaultChecked
              disabled={disabled || readOnlySlug}
            />
            Crear 301 si cambia la URL
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Meta title
          <input
            name="title"
            defaultValue={detail.title}
            maxLength={70}
            disabled={disabled}
            className={inputClass()}
          />
          {lengthHint(detail.title, 30, 70)}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Meta description
          <textarea
            name="description"
            defaultValue={detail.description ?? ''}
            maxLength={180}
            disabled={disabled}
            className={textareaClass()}
          />
          {lengthHint(detail.description, 70, 180)}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Canonical URL
          <input
            name="canonicalUrl"
            defaultValue={detail.canonicalUrl ?? ''}
            disabled={disabled}
            className={inputClass()}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Imagen destacada SEO
            {mediaSelect({ defaultValue: detail.imageId, disabled, media, name: 'imageId' })}
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Open Graph image
            {mediaSelect({ defaultValue: detail.ogImageId, disabled, media, name: 'ogImageId' })}
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Open Graph title
          <input
            name="ogTitle"
            defaultValue={detail.ogTitle ?? ''}
            maxLength={95}
            disabled={disabled}
            className={inputClass()}
          />
          {lengthHint(detail.ogTitle, 30, 95)}
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Open Graph description
          <textarea
            name="ogDescription"
            defaultValue={detail.ogDescription ?? ''}
            maxLength={200}
            disabled={disabled}
            className={textareaClass()}
          />
          {lengthHint(detail.ogDescription, 70, 200)}
        </label>

        <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              name="noindex"
              type="checkbox"
              defaultChecked={detail.noindex}
              disabled={disabled}
            />
            No indexable
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              name="sitemapInclude"
              type="checkbox"
              defaultChecked={detail.sitemapInclude}
              disabled={disabled}
            />
            Incluir en sitemap
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Robots directives
            <textarea
              name="robotsDirectives"
              defaultValue={robots}
              disabled={disabled}
              className={textareaClass()}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Schema JSON-LD
          <textarea
            name="schemaJsonLd"
            defaultValue={schemaJson}
            disabled={disabled}
            className="min-h-48 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-xs outline-none transition focus:border-[var(--zift)] disabled:bg-[var(--background)] disabled:text-[var(--muted)]"
          />
        </label>

        {canManage && (
          <button className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]">
            Guardar SEO
          </button>
        )}
      </form>

      <aside className="grid h-fit gap-5">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="font-mono text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
            Google preview
          </p>
          <p className="mt-4 text-xs text-emerald-700">ziftlab.com{detail.path}</p>
          <h2 className="mt-1 text-xl leading-6 text-blue-700">{previewTitle}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
            {previewDescription}
          </p>
        </article>

        <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
          <div className="relative flex aspect-[1.91/1] items-center justify-center bg-[var(--background)]">
            {ogImage ? (
              <Image src={ogImage} alt="" fill sizes="360px" className="object-cover" unoptimized />
            ) : (
              <span className="text-sm text-[var(--muted)]">Sin imagen OG</span>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs text-[var(--muted)]">ziftlab.com</p>
            <h2 className="mt-1 text-sm font-semibold">{detail.ogTitle || previewTitle}</h2>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
              {detail.ogDescription || previewDescription}
            </p>
          </div>
        </article>

        <article className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm shadow-sm">
          <h2 className="text-lg font-semibold">Estado tecnico</h2>
          <dl className="mt-4 grid gap-3 text-[var(--muted)]">
            <div>
              <dt className="font-semibold text-[var(--ink)]">Indexacion</dt>
              <dd>{detail.noindex ? 'No indexable' : 'Indexable'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink)]">Sitemap</dt>
              <dd>{detail.sitemapInclude ? 'Incluida' : 'Excluida'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--ink)]">Canonical</dt>
              <dd className="break-all">{detail.canonicalUrl || detail.path}</dd>
            </div>
          </dl>
        </article>
      </aside>
    </section>
  )
}

export default async function SeoPage({ searchParams }: SeoPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('seo.read'), searchParams])
  const canManage = access.permissions.includes('seo.manage')
  const tab =
    entityTab(params?.tab) ?? (tabs.some((item) => item.id === params?.tab) ? params?.tab : 'page')
  const entityType = entityTab(tab)
  const [media, redirects, routes, robotsRules] = await Promise.all([
    listSeoMediaOptions(),
    listRedirects({ q: params?.q }),
    listPublicSeoRoutes(),
    getGlobalRobotsRules(),
  ])
  const entities = entityType ? await listSeoEntities({ q: params?.q, type: entityType }) : []
  const selectedId = entityType ? params?.entity || entities[0]?.id : null
  const selected = entityType && selectedId ? await getSeoEntity(entityType, selectedId) : null
  const pageEntities = tab === '404' ? await listSeoEntities({ type: 'page' }) : []
  const notFoundPage = pageEntities.find((item) => item.path === '/404')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Crecimiento"
        title="SEO"
        description="Control de metadata, slugs, JSON-LD, redirects, robots y sitemap desde la DB propia."
      />

      {params?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo guardar: {params.error}.
        </p>
      )}
      {params?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <nav className="mt-8 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/seo?tab=${item.id}`}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {entityType && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
            <form className="mb-4">
              <input type="hidden" name="tab" value={entityType} />
              <input
                name="q"
                defaultValue={params?.q}
                placeholder={`Buscar ${SEO_ENTITY_PLURAL_LABELS[entityType].toLowerCase()}`}
                className={inputClass()}
              />
            </form>
            <div className="grid gap-2">
              {entities.map((entity) => (
                <Link
                  key={entity.id}
                  href={`/dashboard/seo?tab=${entityType}&entity=${entity.id}${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`}
                  className={`rounded-md border px-3 py-3 text-sm transition ${
                    entity.id === selectedId
                      ? 'border-[var(--ink)] bg-[var(--background)]'
                      : 'border-[var(--line)] hover:border-[var(--ink)]'
                  }`}
                >
                  <span className="block font-semibold">{entity.title}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">{entity.path}</span>
                </Link>
              ))}
            </div>
          </aside>

          {selected ? (
            <SeoEditor canManage={canManage} detail={selected} media={media} />
          ) : (
            <EmptyState
              title="Sin entidades"
              message="No hay registros propios para este tipo todavia."
            />
          )}
        </section>
      )}

      {tab === 'redirects' && (
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
            {redirects.map((redirect) => (
              <form
                key={redirect.id}
                action={saveRedirect}
                className="grid gap-3 border-b border-[var(--line)] p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_110px_90px_auto]"
              >
                <CsrfField />
                <input type="hidden" name="redirectId" value={redirect.id} />
                <input
                  name="fromPath"
                  defaultValue={redirect.fromPath}
                  disabled={!canManage}
                  className={inputClass()}
                />
                <input
                  name="toPath"
                  defaultValue={redirect.toPath}
                  disabled={!canManage}
                  className={inputClass()}
                />
                <select
                  name="statusCode"
                  defaultValue={redirect.statusCode}
                  disabled={!canManage}
                  className={inputClass()}
                >
                  <option value="301">301</option>
                  <option value="302">302</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={redirect.active}
                    disabled={!canManage}
                  />
                  Activa
                </label>
                {canManage && (
                  <div className="flex gap-2">
                    <button className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-white">
                      Guardar
                    </button>
                    <button
                      formAction={deleteRedirect}
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </form>
            ))}
            {redirects.length === 0 && (
              <div className="p-4">
                <EmptyState
                  title="Sin redirects"
                  message="No hay reglas propias creadas todavia."
                />
              </div>
            )}
          </div>

          {canManage && (
            <form
              action={saveRedirect}
              className="grid h-fit gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
            >
              <CsrfField />
              <h2 className="text-lg font-semibold">Nueva redireccion</h2>
              <input name="fromPath" placeholder="/ruta-antigua" className={inputClass()} />
              <input
                name="toPath"
                placeholder="/ruta-nueva o https://..."
                className={inputClass()}
              />
              <select name="statusCode" defaultValue="301" className={inputClass()}>
                <option value="301">301 permanente</option>
                <option value="302">302 temporal</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input name="active" type="checkbox" defaultChecked />
                Activa
              </label>
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                Crear redirect
              </button>
            </form>
          )}
        </section>
      )}

      {tab === 'sitemap' && (
        <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Rutas publicas"
              value={String(routes.length)}
              helper="Publicadas o programadas."
            />
            <StatCard
              label="Incluidas"
              value={String(
                routes.filter((route) => route.sitemapInclude && !route.noindex).length,
              )}
              helper="Candidatas al sitemap."
            />
            <StatCard
              label="Excluidas"
              value={String(
                routes.filter((route) => !route.sitemapInclude || route.noindex).length,
              )}
              helper="Por noindex o flag sitemap."
            />
          </div>
          <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
            {routes.map((route) => (
              <div
                key={`${route.entityType}-${route.entityId}`}
                className="grid gap-2 border-b border-[var(--line)] px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_140px_140px]"
              >
                <span>{route.path}</span>
                <span>{route.sitemapInclude ? 'Sitemap' : 'Excluida'}</span>
                <span>{route.noindex ? 'Noindex' : 'Indexable'}</span>
              </div>
            ))}
          </section>
        </section>
      )}

      {tab === 'robots' && (
        <section className="mt-8 max-w-3xl">
          <form
            action={updateRobotsRules}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
          >
            <CsrfField />
            <h2 className="text-lg font-semibold">Reglas globales robots.txt</h2>
            <textarea
              name="rules"
              defaultValue={robotsRules.join('\n')}
              disabled={!canManage}
              className="min-h-64 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-xs outline-none transition focus:border-[var(--zift)]"
            />
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                Guardar robots
              </button>
            )}
          </form>
        </section>
      )}

      {tab === '404' && (
        <section className="mt-8 max-w-3xl rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Pagina 404</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            La web usa el 404 estatico actual si no hay una pagina 404 publicada en la DB propia.
          </p>
          {notFoundPage ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/dashboard/pages/${notFoundPage.id}`}
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
              >
                Editar 404
              </Link>
              <Link
                href={`/dashboard/seo?tab=page&entity=${notFoundPage.id}`}
                className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-semibold"
              >
                SEO de 404
              </Link>
            </div>
          ) : (
            canManage && (
              <form action={ensureNotFoundPage} className="mt-5">
                <CsrfField />
                <button className="rounded-md bg-[var(--zift)] px-4 py-2 text-sm font-semibold text-white">
                  Crear pagina 404
                </button>
              </form>
            )
          )}
        </section>
      )}
    </main>
  )
}
