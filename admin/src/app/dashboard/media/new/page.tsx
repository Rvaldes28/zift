import Link from 'next/link'

import { PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { uploadMedia } from '@/lib/media/actions'
import { requirePermission } from '@/lib/rbac/access'

interface NewMediaPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

function inputClass() {
  return 'h-10 rounded-md border border-[var(--line)] px-3 text-sm outline-none transition focus:border-[var(--zift)]'
}

export default async function NewMediaPage({ searchParams }: NewMediaPageProps) {
  const [, params] = await Promise.all([requirePermission('media.manage'), searchParams])

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Media"
        title="Subir archivo"
        description="Guarda imagenes y PDFs en MinIO/S3 con metadata propia en PostgreSQL."
        actions={
          <Link
            href="/dashboard/media"
            className="inline-flex h-11 items-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            Volver
          </Link>
        }
      />

      {params?.error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Revisa el archivo, el alt obligatorio y el limite de 12MB.
        </p>
      )}

      <form
        action={uploadMedia}
        className="mt-8 grid max-w-3xl gap-5 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
      >
        <CsrfField />
        <label className="grid gap-2 text-sm font-medium">
          Archivo
          <input name="file" type="file" accept="image/*,application/pdf" required />
          <span className="text-xs font-normal text-[var(--muted)]">
            JPG, PNG, WEBP, GIF, SVG o PDF. Maximo 12MB.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Alt / descripcion accesible
          <input name="alt" className={inputClass()} required />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Caption
          <input name="caption" className={inputClass()} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Carpeta
            <input name="folderPath" placeholder="/home/banners" className={inputClass()} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Tags
            <input name="tags" placeholder="home, hero, campana" className={inputClass()} />
          </label>
        </div>

        <button className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]">
          Subir archivo
        </button>
      </form>
    </main>
  )
}
