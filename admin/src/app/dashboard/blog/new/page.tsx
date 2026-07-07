import Link from 'next/link'

import { PageHeader } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { createPost } from '@/lib/blog/actions'
import { requirePermission } from '@/lib/rbac/access'

interface NewPostPageProps {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  await requirePermission('content.manage')
  const params = await searchParams

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Blog"
        title="Crear articulo"
        description="Crea un borrador inicial. Luego podras asignar autor, categoria, tags, SEO, relacionados y publicar."
        actions={
          <Link
            href="/dashboard/blog"
            className="inline-flex h-11 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold"
          >
            Volver al blog
          </Link>
        }
      />

      <form
        action={createPost}
        className="mt-8 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm"
      >
        <CsrfField />
        <label className="grid gap-2 text-sm font-medium">
          Titulo
          <input
            name="title"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input
            name="slug"
            placeholder="se genera desde el titulo si lo dejas vacio"
            className="h-11 rounded-md border border-[var(--line)] px-3 outline-none transition focus:border-[var(--zift)]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Extracto
          <textarea
            name="excerpt"
            className="min-h-28 rounded-md border border-[var(--line)] px-3 py-2 outline-none transition focus:border-[var(--zift)]"
            required
          />
        </label>
        {params?.error === 'invalid' && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Revisa los datos. Titulo, extracto y slug son obligatorios.
          </p>
        )}
        {params?.error === 'duplicate' && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Ya existe un articulo con ese slug.
          </p>
        )}
        <button
          type="submit"
          className="h-11 rounded-md bg-[var(--zift)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--zift-dark)]"
        >
          Crear borrador
        </button>
      </form>
    </main>
  )
}
