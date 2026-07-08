import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { restoreBackupAction } from '@/lib/backups/actions'
import {
  backupScopeLabel,
  backupStatusLabel,
  backupTriggerLabel,
  formatBackupSize,
  getBackupDetail,
} from '@/lib/backups/queries'
import { requirePermission } from '@/lib/rbac/access'

interface BackupDetailPageProps {
  params: Promise<{ id: string }>
}

function dateLabel(value: Date | null): string {
  if (!value) return 'Pendiente'
  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function metadataPreview(value: Record<string, unknown>): string {
  const text = JSON.stringify(value, null, 2)
  return text.length > 1200 ? `${text.slice(0, 1200)}\n...` : text
}

export default async function BackupDetailPage({ params }: BackupDetailPageProps) {
  const { id } = await params
  const [{ access }, detail] = await Promise.all([
    requirePermission('settings.read'),
    getBackupDetail(id),
  ])

  if (!detail.backup) notFound()

  const backup = detail.backup
  const canManage = access.permissions.includes('settings.manage')
  const canRestore = canManage && (backup.status === 'completed' || backup.status === 'restored')

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Backups"
        title={backup.filename ?? backup.id}
        description="Detalle operativo del respaldo, artefacto en S3/MinIO, logs y restauracion controlada."
        actions={
          <>
            <Link
              href="/dashboard/backups"
              className="inline-flex h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--ink)]"
            >
              Volver
            </Link>
            {canManage && backup.storageKey && (
              <a
                href={`/dashboard/backups/${backup.id}/download`}
                className="inline-flex h-10 items-center rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white"
              >
                Descargar
              </a>
            )}
          </>
        }
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tipo" value={backupScopeLabel(backup.scope)} helper={backup.kind} />
        <StatCard
          label="Estado"
          value={backupStatusLabel(backup.status)}
          helper={backup.errorMessage ?? 'Sin errores'}
        />
        <StatCard
          label="Origen"
          value={backupTriggerLabel(backup.trigger)}
          helper="Manual, automatico o previo a restore."
        />
        <StatCard
          label="Peso"
          value={formatBackupSize(backup.filesize)}
          helper={backup.mimeType ?? 'Artefacto S3'}
        />
        <StatCard
          label="Inicio"
          value={dateLabel(backup.startedAt)}
          helper={`Fin: ${dateLabel(backup.finishedAt)}`}
        />
        <StatCard
          label="Restore"
          value={backup.restoredAt ? 'Ejecutado' : 'Sin restore'}
          helper={dateLabel(backup.restoredAt)}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Logs</h2>
          {detail.logs.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {detail.logs.map((log) => (
                <div key={log.id} className="rounded-md border border-[var(--line)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{log.message}</p>
                    <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                      {log.level}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">{dateLabel(log.createdAt)}</p>
                  {Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--background)] p-3 text-xs text-[var(--muted)]">
                      {metadataPreview(log.metadata)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Este backup aun no tiene logs.</p>
          )}
        </article>

        <aside className="grid gap-6">
          <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Artefacto</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold">Bucket</dt>
                <dd className="mt-1 break-all text-[var(--muted)]">
                  {backup.bucket ?? 'Pendiente'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Storage key</dt>
                <dd className="mt-1 break-all text-[var(--muted)]">
                  {backup.storageKey ?? 'Pendiente'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Checksum SHA-256</dt>
                <dd className="mt-1 break-all text-[var(--muted)]">
                  {backup.checksum ?? 'Pendiente'}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-red-100 bg-red-50 p-5 text-red-900 shadow-sm">
            <h2 className="text-lg font-semibold">Restore controlado</h2>
            <p className="mt-3 text-sm leading-6">
              Antes de restaurar se crea un backup previo automatico. Restaurar DB es una operacion
              in-place y puede reemplazar datos actuales por el snapshot seleccionado.
            </p>
            {canRestore ? (
              <form action={restoreBackupAction} className="mt-5 grid gap-3">
                <CsrfField />
                <input type="hidden" name="backupId" value={backup.id} />
                <label className="grid gap-2 text-sm font-semibold">
                  Escribe RESTAURAR para confirmar
                  <input
                    name="confirmation"
                    className="h-10 rounded-md border border-red-200 bg-white px-3 text-sm text-[var(--ink)] outline-none focus:border-red-500"
                    placeholder="RESTAURAR"
                  />
                </label>
                <button className="h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800">
                  Restaurar backup
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm font-semibold">
                No disponible: requiere `settings.manage` y un backup completado.
              </p>
            )}
          </article>
        </aside>
      </section>
    </main>
  )
}
