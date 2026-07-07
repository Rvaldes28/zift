import type { MediaAsset, PageSection } from '@ziftlab/db'

import { CsrfField } from '@/components/security/csrf-field'
import { deleteSection, updateSection } from '@/lib/content/actions'
import { SECTION_KIND_LABELS, SECTION_KINDS, type SectionKind } from '@/lib/content/types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function textValue(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

function ctaValue(data: Record<string, unknown>, key: string): string {
  const cta = asRecord(data[key])
  return typeof cta.label === 'string' ? cta.label : ''
}

function ctaHref(data: Record<string, unknown>, key: string): string {
  const cta = asRecord(data[key])
  return typeof cta.href === 'string' ? cta.href : ''
}

function imageValue(data: Record<string, unknown>): string {
  return typeof data.imageId === 'string' ? data.imageId : ''
}

function itemsText(data: Record<string, unknown>, firstKey: string, secondKey: string): string {
  const items = Array.isArray(data.items) ? data.items : []

  return items
    .map((item) => {
      const record = asRecord(item)
      return `${String(record[firstKey] ?? '')}|${String(record[secondKey] ?? '')}`
    })
    .join('\n')
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-24 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]"
    />
  )
}

function MediaSelect({
  defaultValue,
  media,
  name = 'imageId',
}: {
  defaultValue?: string
  media: MediaAsset[]
  name?: string
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
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

function SectionDataFields({
  data,
  kind,
  media,
}: {
  data: Record<string, unknown>
  kind: SectionKind
  media: MediaAsset[]
}) {
  if (kind === 'hero') {
    return (
      <>
        <Field label="Eyebrow">
          <TextInput name="eyebrow" defaultValue={textValue(data, 'eyebrow')} />
        </Field>
        <Field label="Titulo">
          <TextInput name="title" defaultValue={textValue(data, 'title')} />
        </Field>
        <Field label="Subtitulo">
          <TextArea name="subtitle" defaultValue={textValue(data, 'subtitle')} />
        </Field>
        <Field label="Imagen">
          <MediaSelect media={media} defaultValue={imageValue(data)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="CTA principal">
            <TextInput name="primaryLabel" defaultValue={ctaValue(data, 'primaryCta')} />
          </Field>
          <Field label="URL CTA principal">
            <TextInput name="primaryHref" defaultValue={ctaHref(data, 'primaryCta')} />
          </Field>
          <Field label="CTA secundario">
            <TextInput name="secondaryLabel" defaultValue={ctaValue(data, 'secondaryCta')} />
          </Field>
          <Field label="URL CTA secundario">
            <TextInput name="secondaryHref" defaultValue={ctaHref(data, 'secondaryCta')} />
          </Field>
        </div>
      </>
    )
  }

  if (kind === 'cta') {
    return (
      <>
        <Field label="Titulo">
          <TextInput name="title" defaultValue={textValue(data, 'title')} />
        </Field>
        <Field label="Texto">
          <TextArea name="text" defaultValue={textValue(data, 'text')} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Boton">
            <TextInput name="primaryLabel" defaultValue={ctaValue(data, 'cta')} />
          </Field>
          <Field label="URL">
            <TextInput name="primaryHref" defaultValue={ctaHref(data, 'cta')} />
          </Field>
        </div>
      </>
    )
  }

  if (kind === 'stats') {
    return (
      <>
        <Field label="Titulo opcional">
          <TextInput name="title" defaultValue={textValue(data, 'title')} />
        </Field>
        <Field label="Items, uno por linea: valor|etiqueta">
          <TextArea name="items" defaultValue={itemsText(data, 'value', 'label')} />
        </Field>
      </>
    )
  }

  if (kind === 'benefits' || kind === 'process' || kind === 'faq') {
    return (
      <>
        <Field label="Titulo">
          <TextInput name="title" defaultValue={textValue(data, 'title')} />
        </Field>
        <Field label="Subtitulo">
          <TextArea name="subtitle" defaultValue={textValue(data, 'subtitle')} />
        </Field>
        <Field label="Items, uno por linea: titulo|texto">
          <TextArea name="items" defaultValue={itemsText(data, 'title', 'text')} />
        </Field>
      </>
    )
  }

  if (
    kind === 'featured_services' ||
    kind === 'featured_projects' ||
    kind === 'testimonials' ||
    kind === 'clients'
  ) {
    return (
      <>
        <Field label="Titulo">
          <TextInput name="title" defaultValue={textValue(data, 'title')} />
        </Field>
        <Field label="Subtitulo">
          <TextArea name="subtitle" defaultValue={textValue(data, 'subtitle')} />
        </Field>
      </>
    )
  }

  if (kind === 'rich_text') {
    return (
      <Field label="Cuerpo">
        <TextArea name="body" defaultValue={textValue(data, 'body')} />
      </Field>
    )
  }

  return (
    <>
      <Field label="Titulo">
        <TextInput name="title" defaultValue={textValue(data, 'title')} />
      </Field>
      <Field label="Texto">
        <TextArea name="text" defaultValue={textValue(data, 'text')} />
      </Field>
      {kind === 'image_banner' && (
        <Field label="Imagen">
          <MediaSelect media={media} defaultValue={imageValue(data)} />
        </Field>
      )}
    </>
  )
}

export function SectionEditor({
  media,
  pageId,
  section,
}: {
  media: MediaAsset[]
  pageId: string
  section: PageSection
}) {
  const kind = SECTION_KINDS.includes(section.kind as SectionKind)
    ? (section.kind as SectionKind)
    : 'text'
  const data = asRecord(section.data)

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <form action={updateSection} className="grid gap-4">
        <CsrfField />
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="sectionId" value={section.id} />

        <div className="grid gap-4 md:grid-cols-[1fr_180px_120px]">
          <Field label="Etiqueta">
            <TextInput name="label" defaultValue={section.label} />
          </Field>
          <Field label="Bloque">
            <select
              name="kind"
              defaultValue={kind}
              className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
            >
              {SECTION_KINDS.map((item) => (
                <option key={item} value={item}>
                  {SECTION_KIND_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Orden">
            <TextInput name="position" type="number" defaultValue={section.position} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="enabled" type="checkbox" defaultChecked={section.enabled} />
          Seccion visible
        </label>

        <SectionDataFields data={data} kind={kind} media={media} />

        <Field label="Settings JSON opcional">
          <TextArea
            name="settings"
            defaultValue={JSON.stringify(section.settings ?? {}, null, 2)}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
          >
            Guardar seccion
          </button>
        </div>
      </form>

      <form action={deleteSection} className="mt-3">
        <CsrfField />
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="sectionId" value={section.id} />
        <button
          type="submit"
          className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Eliminar seccion
        </button>
      </form>
    </article>
  )
}
