import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode
  description?: ReactNode
  eyebrow?: string
  title: string
}) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}

export function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {helper && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{helper}</p>}
    </article>
  )
}

export function ModuleCard({
  description,
  href,
  label,
  status = 'Preparado',
}: {
  description: string
  href?: string
  label: string
  status?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{label}</h2>
        <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--ink)]"
      >
        {content}
      </Link>
    )
  }

  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      {content}
    </article>
  )
}

export function EmptyState({
  action,
  message,
  title,
}: {
  action?: ReactNode
  message: string
  title: string
}) {
  return (
    <section className="rounded-lg border border-dashed border-[var(--line)] bg-white/72 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  )
}

export function LoadingState({ label = 'Cargando modulo' }: { label?: string }) {
  return (
    <main className="px-6 py-8 lg:px-10">
      <div className="max-w-3xl animate-pulse">
        <div className="h-3 w-36 rounded-full bg-slate-200" />
        <div className="mt-5 h-10 w-2/3 rounded-md bg-slate-200" />
        <div className="mt-4 h-4 w-1/2 rounded-full bg-slate-200" />
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 rounded-lg border border-[var(--line)] bg-white" />
        ))}
      </section>
      <p className="sr-only">{label}</p>
    </main>
  )
}

export function ErrorState({
  action,
  message,
  title = 'No se pudo cargar esta vista',
}: {
  action?: ReactNode
  message: string
  title?: string
}) {
  return (
    <main className="px-6 py-8 lg:px-10">
      <section className="max-w-2xl rounded-lg border border-red-100 bg-red-50 p-6 text-red-800">
        <p className="font-mono text-xs tracking-[0.16em] uppercase">Error</p>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6">{message}</p>
        {action && <div className="mt-5">{action}</div>}
      </section>
    </main>
  )
}
