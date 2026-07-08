import Image from 'next/image'
import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { getMediaFilterOptions, listMediaAssets } from '@/lib/media/queries'
import { requirePermission } from '@/lib/rbac/access'

interface MediaPageProps {
  searchParams?: Promise<{
    folder?: string
    q?: string
    status?: string
    tag?: string
    type?: string
  }>
}

function fileLabel(asset: {
  filesize: number | null
  height: number | null
  width: number | null
}) {
  const size = asset.filesize ? `${(asset.filesize / 1024).toFixed(1)} KB` : 'Peso pendiente'
  const dimensions =
    asset.width && asset.height ? `${asset.width}x${asset.height}` : 'Sin dimensiones'

  return `${size} · ${dimensions}`
}

function isImage(mimeType: string | null) {
  return Boolean(mimeType?.startsWith('image/'))
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const [{ access }, params] = await Promise.all([requirePermission('media.read'), searchParams])
  const [assets, filters] = await Promise.all([listMediaAssets(params), getMediaFilterOptions()])
  const canManage = access.permissions.includes('media.manage')
  const imageCount = assets.filter((asset) => isImage(asset.mimeType)).length
  const pdfCount = assets.filter((asset) => asset.mimeType === 'application/pdf').length

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Biblioteca"
        title="Media"
        description="Gestiona imagenes y archivos desde MinIO/S3 con metadata en PostgreSQL."
        actions={
          canManage && (
            <Link
              href="/dashboard/media/new"
              className="inline-flex h-11 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
            >
              Subir archivo
            </Link>
          )
        }
      />

      {params?.status && (
        <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cambio guardado.
        </p>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Assets visibles"
          value={String(assets.length)}
          helper="Filtrados por la vista actual."
        />
        <StatCard
          label="Imagenes"
          value={String(imageCount)}
          helper="Con dimensiones cuando el formato lo permite."
        />
        <StatCard
          label="PDFs"
          value={String(pdfCount)}
          helper="Documentos servidos desde el storage propio."
        />
      </section>

      <form className="mt-8 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
        <input
          name="q"
          defaultValue={params?.q}
          placeholder="Buscar por nombre, alt o caption"
          className="h-10 min-w-64 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]"
        />
        <select
          name="type"
          defaultValue={params?.type ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los tipos</option>
          <option value="image">Imagenes</option>
          <option value="pdf">PDF</option>
        </select>
        <select
          name="folder"
          defaultValue={params?.folder ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todas las carpetas</option>
          {filters.folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
        <select
          name="tag"
          defaultValue={params?.tag ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Todos los tags</option>
          {filters.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params?.status ?? ''}
          className="h-10 rounded-md border border-[var(--line)] px-3 text-sm"
        >
          <option value="">Activos</option>
          <option value="deleted">Eliminados</option>
          <option value="replaced">Reemplazados</option>
        </select>
        <button
          type="submit"
          className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      {assets.length > 0 ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/dashboard/media/${asset.id}`}
              className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--ink)]"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center bg-[var(--background)]">
                {isImage(asset.mimeType) && !asset.deletedAt ? (
                  <Image
                    src={asset.url}
                    alt={asset.alt}
                    fill
                    sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--muted)]">
                    {asset.mimeType === 'application/pdf' ? 'PDF' : 'Archivo'}
                  </span>
                )}
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <h2 className="truncate text-sm font-semibold">{asset.alt || asset.filename}</h2>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">{asset.filename}</p>
                </div>
                <p className="text-xs text-[var(--muted)]">{fileLabel(asset)}</p>
                <div className="flex flex-wrap gap-2">
                  {asset.folderPath !== '/' && (
                    <span className="rounded-full bg-[var(--background)] px-2 py-1 text-xs text-[var(--muted)]">
                      {asset.folderPath}
                    </span>
                  )}
                  {asset.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--background)] px-2 py-1 text-xs text-[var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No hay archivos"
            message="Sube el primer asset para empezar a usar la biblioteca propia en paginas y secciones."
            action={
              canManage && (
                <Link
                  href="/dashboard/media/new"
                  className="inline-flex h-10 items-center rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white"
                >
                  Subir archivo
                </Link>
              )
            }
          />
        </div>
      )}
    </main>
  )
}
