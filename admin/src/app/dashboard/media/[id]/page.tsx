import Image from 'next/image'
import { notFound } from 'next/navigation'

import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { deleteMedia, replaceMediaFile, updateMediaMetadata } from '@/lib/media/actions'
import { getMediaAssetById } from '@/lib/media/queries'
import { requirePermission } from '@/lib/rbac/access'

interface MediaDetailPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    error?: string
    status?: string
  }>
}

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

function textareaClass() {
  return 'min-h-24 rounded-md border border-[var(--line)] px-3 py-2 text-sm outline-none transition focus:border-[var(--zift)]'
}

function isImage(mimeType: string | null) {
  return Boolean(mimeType?.startsWith('image/'))
}

function formatSize(value: number | null) {
  if (!value) return 'Pendiente'
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`

  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function formatDimensions(width: number | null, height: number | null) {
  if (!width || !height) return 'No aplica'

  return `${width} x ${height}`
}

export default async function MediaDetailPage({ params, searchParams }: MediaDetailPageProps) {
  const [{ id }, query, { access }] = await Promise.all([
    params,
    searchParams,
    requirePermission('media.read'),
  ])
  const asset = await getMediaAssetById(id, { includeDeleted: true })
  if (!asset) notFound()

  const canManage = access.permissions.includes('media.manage')
  const deleted = Boolean(asset.deletedAt)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Media"
        title={asset.alt || asset.filename}
        description={`${asset.filename} · ${asset.mimeType ?? 'tipo pendiente'}`}
      />

      {query?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          La accion no se pudo completar. Revisa el archivo, permisos o campos requeridos.
        </p>
      )}
      {query?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}
      {deleted && (
        <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este asset esta eliminado logicamente. El objeto se conserva en el bucket para rollback.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard
          label="Estado"
          value={asset.status}
          helper={deleted ? 'Soft delete activo.' : 'Disponible en API publica.'}
        />
        <StatCard
          label="Peso"
          value={formatSize(asset.filesize)}
          helper="Guardado desde el upload original."
        />
        <StatCard
          label="Dimensiones"
          value={formatDimensions(asset.width, asset.height)}
          helper="Solo para imagenes."
        />
        <StatCard
          label="Carpeta"
          value={asset.folderPath}
          helper="Agrupacion interna del dashboard."
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <article className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
          <div className="relative flex min-h-96 items-center justify-center bg-[var(--background)]">
            {isImage(asset.mimeType) && !deleted ? (
              <Image
                src={asset.url}
                alt={asset.alt}
                fill
                sizes="(min-width: 1280px) 60vw, 100vw"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="p-8 text-center">
                <p className="text-lg font-semibold">
                  {asset.mimeType === 'application/pdf' ? 'Documento PDF' : 'Archivo'}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{asset.filename}</p>
              </div>
            )}
          </div>
          <div className="grid gap-3 border-t border-[var(--line)] p-4 text-sm">
            <label className="grid gap-2 font-medium">
              URL publica
              <input readOnly value={asset.url} className={inputClass()} />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Storage key: {asset.storageKey ?? 'pendiente'} · Bucket: {asset.bucket ?? 'pendiente'}
            </p>
          </div>
        </article>

        <aside className="grid gap-5">
          <form
            action={updateMediaMetadata}
            className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
          >
            <CsrfField />
            <input type="hidden" name="assetId" value={asset.id} />
            <h2 className="text-lg font-semibold">Metadata</h2>
            <label className="grid gap-2 text-sm font-medium">
              Alt / descripcion
              <input
                name="alt"
                defaultValue={asset.alt}
                className={inputClass()}
                required
                disabled={!canManage || deleted}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Caption
              <input
                name="caption"
                defaultValue={asset.caption ?? ''}
                className={inputClass()}
                disabled={!canManage || deleted}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Carpeta
              <input
                name="folderPath"
                defaultValue={asset.folderPath}
                className={inputClass()}
                disabled={!canManage || deleted}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Tags
              <input
                name="tags"
                defaultValue={asset.tags.join(', ')}
                className={inputClass()}
                disabled={!canManage || deleted}
              />
            </label>
            {canManage && !deleted && (
              <button className="h-10 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white">
                Guardar metadata
              </button>
            )}
          </form>

          {canManage && !deleted && (
            <form
              action={replaceMediaFile}
              className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm"
            >
              <CsrfField />
              <input type="hidden" name="assetId" value={asset.id} />
              <h2 className="text-lg font-semibold">Reemplazar archivo</h2>
              <input name="file" type="file" accept="image/*,application/pdf" required />
              <input type="hidden" name="alt" value={asset.alt} />
              <input type="hidden" name="caption" value={asset.caption ?? ''} />
              <input type="hidden" name="folderPath" value={asset.folderPath} />
              <input type="hidden" name="tags" value={asset.tags.join(', ')} />
              <p className="text-sm leading-6 text-[var(--muted)]">
                El ID del asset se conserva para no romper referencias en paginas.
              </p>
              <button className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold">
                Reemplazar
              </button>
            </form>
          )}

          {canManage && !deleted && (
            <form
              action={deleteMedia}
              className="grid gap-4 rounded-lg border border-red-100 bg-red-50 p-5 text-red-900 shadow-sm"
            >
              <CsrfField />
              <input type="hidden" name="assetId" value={asset.id} />
              <h2 className="text-lg font-semibold">Eliminar de forma segura</h2>
              <label className="grid gap-2 text-sm font-medium">
                Motivo opcional
                <textarea name="reason" className={textareaClass()} />
              </label>
              <p className="text-sm leading-6">
                Solo se marca como eliminado en PostgreSQL. El objeto fisico queda en MinIO/S3.
              </p>
              <button className="h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white">
                Eliminar asset
              </button>
            </form>
          )}

          <article className="rounded-lg border border-[var(--line)] bg-white p-5 text-sm shadow-sm">
            <h2 className="text-lg font-semibold">Auditoria tecnica</h2>
            <dl className="mt-4 grid gap-3 text-[var(--muted)]">
              <div>
                <dt className="font-semibold text-[var(--ink)]">Checksum</dt>
                <dd className="break-all">{asset.checksum ?? 'Pendiente'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--ink)]">Actualizado</dt>
                <dd>{asset.updatedAt.toLocaleString('es-PA')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--ink)]">Reemplazado</dt>
                <dd>{asset.replacedAt ? asset.replacedAt.toLocaleString('es-PA') : 'Nunca'}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </section>
    </main>
  )
}
