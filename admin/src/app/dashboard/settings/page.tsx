import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import {
  saveLegalDocument,
  updateBrandSettings,
  updateCookiesSettings,
  updateGeneralSettings,
  updateScriptsSettings,
  updateSocialSettings,
} from '@/lib/settings/actions'
import { DEFAULT_COLORS, SCRIPT_PROVIDERS, SOCIAL_PLATFORMS } from '@/lib/settings/defaults'
import { getSettingsDashboard, type JsonRecord } from '@/lib/settings/queries'
import { requirePermission } from '@/lib/rbac/access'
import type { ReactNode } from 'react'

interface SettingsPageProps {
  searchParams?: Promise<{
    status?: string
    tab?: string
  }>
}

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'brand', label: 'Marca' },
  { id: 'social', label: 'Redes' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'legal', label: 'Legales' },
] as const

const colorFields: Array<[keyof typeof DEFAULT_COLORS, string]> = [
  ['primary', 'Color principal'],
  ['primaryDark', 'Color principal hover'],
  ['primaryTint', 'Tinte suave'],
  ['accent', 'Acento / glow'],
  ['ink', 'Tinta'],
  ['paper', 'Papel'],
]

function value(record: JsonRecord, key: string): string {
  const item = record[key]
  return typeof item === 'string' ? item : ''
}

function nested(record: JsonRecord, key: string): JsonRecord {
  const item = record[key]
  return item && typeof item === 'object' && !Array.isArray(item) ? (item as JsonRecord) : {}
}

function hoursText(value: unknown): string {
  if (!Array.isArray(value)) return ''

  return value
    .filter(
      (item): item is { label: string; value: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { value?: unknown }).value === 'string',
    )
    .map((item) => `${item.label}: ${item.value}`)
    .join('\n')
}

function socialText(value: unknown): string {
  if (!Array.isArray(value)) return ''

  return value
    .filter(
      (item): item is { platform: string; url: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as { platform?: unknown }).platform === 'string' &&
        typeof (item as { url?: unknown }).url === 'string',
    )
    .map((item) => `${item.platform} ${item.url}`)
    .join('\n')
}

function providerBySlug(scripts: JsonRecord, provider: string) {
  const providers = Array.isArray(scripts.providers) ? scripts.providers : []
  return providers.find(
    (item): item is { enabled?: boolean; id?: string; provider: string } =>
      Boolean(item) &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item as { provider?: unknown }).provider === provider,
  )
}

function feedback(status?: string): string | null {
  const messages: Record<string, string> = {
    invalid: 'Hay datos invalidos. Revisa URLs, email, colores, media o HTML legal.',
    published: 'Documento legal publicado.',
    saved: 'Cambios guardados.',
  }

  return status ? (messages[status] ?? messages.saved) : null
}

function Field({
  children,
  helper,
  label,
}: {
  children: ReactNode
  helper?: string
  label: string
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {helper && (
        <span className="text-xs leading-5 font-normal text-[var(--muted)]">{helper}</span>
      )}
    </label>
  )
}

function textInputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm font-normal outline-none transition focus:border-[var(--zift)]'
}

function textareaClass() {
  return 'min-h-28 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm font-normal outline-none transition focus:border-[var(--zift)]'
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [{ access }, params, settings] = await Promise.all([
    requirePermission('settings.read'),
    searchParams,
    getSettingsDashboard(),
  ])
  const activeTab = tabs.some((tab) => tab.id === params?.tab) ? params!.tab! : 'general'
  const canManage = access.permissions.includes('settings.manage')
  const colors = { ...DEFAULT_COLORS, ...nested(settings.brand, 'colors') }
  const message = feedback(params?.status)
  const imageAssets = settings.imageAssets

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Configuracion general"
        description="Ajustes globales del sitio publico desde la DB propia: identidad, marca, contacto, cookies, scripts y legales."
      />

      {message && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {message}
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Sitio"
          value={value(settings.site, 'siteName') || 'ZiftLab'}
          helper="Global site-settings."
        />
        <StatCard
          label="Media"
          value={String(imageAssets.length)}
          helper="Imagenes disponibles para marca."
        />
        <StatCard label="Scripts" value="Allowlist" helper="Sin HTML/JS arbitrario." />
        <StatCard
          label="Legales"
          value={String(settings.legalDocuments.length)}
          helper="Draft/published con fallback."
        />
        <StatCard
          label="Permiso"
          value={canManage ? 'Editable' : 'Lectura'}
          helper="settings.manage controla cambios."
        />
      </section>

      <nav className="mt-8 flex flex-wrap gap-2 rounded-lg border border-[var(--line)] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`/dashboard/settings?tab=${tab.id}`}
            className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold ${
              activeTab === tab.id
                ? 'bg-[var(--ink)] text-white'
                : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--ink)]'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        {activeTab === 'general' && (
          <form action={updateGeneralSettings} className="grid gap-5 md:grid-cols-2">
            <CsrfField />
            <Field label="Nombre del sitio">
              <input
                name="siteName"
                defaultValue={value(settings.site, 'siteName')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Tagline">
              <input
                name="tagline"
                defaultValue={value(settings.site, 'tagline')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Email de contacto">
              <input
                name="contactEmail"
                defaultValue={value(settings.contact, 'contactEmail')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Telefono">
              <input
                name="phone"
                defaultValue={value(settings.contact, 'phone')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                name="whatsapp"
                defaultValue={value(settings.contact, 'whatsapp')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Calendly URL">
              <input
                name="calendlyUrl"
                defaultValue={value(settings.contact, 'calendlyUrl')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Direccion">
              <input
                name="address"
                defaultValue={value(settings.contact, 'address')}
                className={textInputClass()}
                disabled={!canManage}
              />
            </Field>
            <Field label="Horarios" helper="Una linea por horario: Lunes a viernes: 9:00 - 18:00">
              <textarea
                name="hours"
                defaultValue={hoursText(settings.contact.hours)}
                className={textareaClass()}
                disabled={!canManage}
              />
            </Field>
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white md:col-span-2 md:w-fit">
                Guardar general
              </button>
            )}
          </form>
        )}

        {activeTab === 'brand' && (
          <form action={updateBrandSettings} className="grid gap-5 md:grid-cols-2">
            <CsrfField />
            <Field label="Logo">
              <select
                name="logoId"
                defaultValue={value(settings.brand, 'logoId')}
                className={textInputClass()}
                disabled={!canManage}
              >
                <option value="">Sin logo</option>
                {imageAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.alt || asset.filename}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Favicon">
              <select
                name="faviconId"
                defaultValue={value(settings.brand, 'faviconId')}
                className={textInputClass()}
                disabled={!canManage}
              >
                <option value="">Sin favicon</option>
                {imageAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.alt || asset.filename}
                  </option>
                ))}
              </select>
            </Field>
            {colorFields.map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="color"
                  name={key}
                  defaultValue={String(colors[key] ?? '')}
                  className="h-10 w-24 rounded-md border border-[var(--line)] p-1"
                  disabled={!canManage}
                />
              </Field>
            ))}
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white md:col-span-2 md:w-fit">
                Guardar marca
              </button>
            )}
          </form>
        )}

        {activeTab === 'social' && (
          <form action={updateSocialSettings} className="grid gap-5">
            <CsrfField />
            <Field
              label="Redes sociales"
              helper={`Una por linea: plataforma URL. Plataformas: ${SOCIAL_PLATFORMS.join(', ')}`}
            >
              <textarea
                name="links"
                defaultValue={socialText(settings.social.links)}
                className={textareaClass()}
                disabled={!canManage}
              />
            </Field>
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white md:w-fit">
                Guardar redes
              </button>
            )}
          </form>
        )}

        {activeTab === 'scripts' && (
          <form action={updateScriptsSettings} className="grid gap-4">
            <CsrfField />
            {SCRIPT_PROVIDERS.map((provider) => {
              const stored = providerBySlug(settings.scripts, provider.provider)
              return (
                <article
                  key={provider.provider}
                  className="grid gap-3 rounded-md border border-[var(--line)] p-4 md:grid-cols-[1fr_220px_auto] md:items-center"
                >
                  <div>
                    <h2 className="text-sm font-semibold">{provider.label}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Consentimiento: {provider.consentCategory}. Allowlist segura, sin snippets
                      raw.
                    </p>
                  </div>
                  <input
                    name={`${provider.provider}Id`}
                    defaultValue={stored?.id ?? ''}
                    placeholder="ID del proveedor"
                    className={textInputClass()}
                    disabled={!canManage}
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      name={`${provider.provider}Enabled`}
                      defaultChecked={Boolean(stored?.enabled)}
                      disabled={!canManage}
                    />
                    Activo
                  </label>
                </article>
              )
            })}
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white md:w-fit">
                Guardar scripts
              </button>
            )}
          </form>
        )}

        {activeTab === 'cookies' && (
          <form action={updateCookiesSettings} className="grid gap-5 md:grid-cols-2">
            <CsrfField />
            {[
              ['bannerTitle', 'Titulo del banner'],
              ['bannerText', 'Texto del banner'],
              ['necessaryDescription', 'Descripcion necesarias'],
              ['analyticsLabel', 'Label analitica'],
              ['analyticsDescription', 'Descripcion analitica'],
              ['marketingLabel', 'Label marketing'],
              ['marketingDescription', 'Descripcion marketing'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <textarea
                  name={key}
                  defaultValue={value(settings.cookies, key)}
                  className={textareaClass()}
                  disabled={!canManage}
                />
              </Field>
            ))}
            {canManage && (
              <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white md:col-span-2 md:w-fit">
                Guardar cookies
              </button>
            )}
          </form>
        )}

        {activeTab === 'legal' && (
          <div className="grid gap-6">
            {settings.legalDocuments.map((document) => (
              <form
                key={document.slug}
                action={saveLegalDocument}
                className="grid gap-4 rounded-md border border-[var(--line)] p-4"
              >
                <CsrfField />
                <input type="hidden" name="slug" value={document.slug} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{document.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {document.routePath} · {document.status}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Titulo">
                    <input
                      name="title"
                      defaultValue={document.title}
                      className={textInputClass()}
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Fecha de revision">
                    <input
                      type="date"
                      name="updated"
                      defaultValue={document.updated}
                      className={textInputClass()}
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Descripcion">
                    <textarea
                      name="description"
                      defaultValue={document.description}
                      className={textareaClass()}
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Intro">
                    <textarea
                      name="intro"
                      defaultValue={document.intro}
                      className={textareaClass()}
                      disabled={!canManage}
                    />
                  </Field>
                </div>
                <Field
                  label="HTML legal sanitizado"
                  helper='Debe incluir h2 con id, por ejemplo: <h2 id="responsable">Quién es el responsable</h2>'
                >
                  <textarea
                    name="html"
                    defaultValue={document.html}
                    className="min-h-72 rounded-md border border-[var(--line)] px-3 py-2 font-mono text-sm font-normal outline-none transition focus:border-[var(--zift)]"
                    disabled={!canManage}
                  />
                </Field>
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      name="status"
                      value="draft"
                      className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold"
                    >
                      Guardar draft
                    </button>
                    <button
                      name="status"
                      value="published"
                      className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
                    >
                      Publicar legal
                    </button>
                  </div>
                )}
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
