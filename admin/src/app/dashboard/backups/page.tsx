import Link from 'next/link'

import { EmptyState, PageHeader, StatCard } from '@/components/dashboard/ui'
import { CsrfField } from '@/components/security/csrf-field'
import { createBackupAction } from '@/lib/backups/actions'
import {
  backupScopeLabel,
  backupStatusLabel,
  backupTriggerLabel,
  formatBackupSize,
  getBackupsOverview,
} from '@/lib/backups/queries'
import { requirePermission } from '@/lib/rbac/access'

interface BackupsPageProps {
  searchParams?: Promise<{
    backup?: string
    status?: string
  }>
}

function dateLabel(value: Date | null): string {
  if (!value) return 'Pendiente'
  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function statusClasses(status: string): string {
  if (status === 'failed') return 'bg-red-50 text-red-700'
  if (status === 'running' || status === 'restoring') return 'bg-amber-50 text-amber-700'
  if (status === 'restored') return 'bg-sky-50 text-sky-700'
  return 'bg-emerald-50 text-emerald-700'
}

function feedback(status?: string): string | null {
  const messages: Record<string, string> = {
    created: 'Backup creado correctamente.',
    failed: 'No se pudo crear el backup. Revisa los logs del ultimo intento.',
    restore_failed: 'No se pudo restaurar el backup. Revisa el detalle y los logs.',
    restore_invalid: 'Para restaurar debes escribir RESTAURAR exactamente.',
    restored: 'Restore completado.',
  }

  return status ? (messages[status] ?? null) : null
}

function BackupForm({ scope }: { scope: 'database' | 'full' | 'media' }) {
  return (
    <form action={createBackupAction}>
      <CsrfField />
      <input type="hidden" name="scope" value={scope} />
      <button className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white transition hover:bg-black">
        Crear {backupScopeLabel(scope).toLowerCase()}
      </button>
    </form>
  )
}

export default async function BackupsPage({ searchParams }: BackupsPageProps) {
  const [{ access }, params, overview] = await Promise.all([
    requirePermission('settings.read'),
    searchParams,
    getBackupsOverview(),
  ])
  const canManage = access.permissions.includes('settings.manage')
  const message = feedback(params?.status)

  return (
    <main className="px-6 py-8 lg:px-10">
      <PageHeader
        eyebrow="Sistema"
        title="Backups y restauracion"
        description="Respaldos de la DB propia y media nueva del dashboard."
        actions={
          canManage && (
            <>
              <BackupForm scope="database" />
              <BackupForm scope="media" />
              <BackupForm scope="full" />
            </>
          )
        }
      />

      {message && (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-4 text-sm shadow-sm">
          {message}
          {params?.backup && (
            <Link
              href={`/dashboard/backups/${params.backup}`}
              className="ml-2 font-semibold text-[var(--zift)]"
            >
              Ver detalle
            </Link>
          )}
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Ultimo backup"
          value={
            overview.lastSuccessfulBackup
              ? backupScopeLabel(overview.lastSuccessfulBackup.scope)
              : 'Sin backups'
          }
          helper={
            overview.lastSuccessfulBackup
              ? dateLabel(overview.lastSuccessfulBackup.finishedAt)
              : 'Aun no hay respaldo exitoso.'
          }
        />
        <StatCard
          label="En progreso"
          value={String(overview.runningCount)}
          helper="Locks evitan ejecuciones concurrentes."
        />
        <StatCard
          label="Fallidos"
          value={String(overview.failedCount)}
          helper="Revisar logs para diagnostico."
        />
        <StatCard
          label="Automaticos"
          value={overview.autoEnabled ? 'Activos' : 'Inactivos'}
          helper={overview.autoEnabled ? overview.autoCron : 'BACKUP_AUTO_ENABLED=false'}
        />
        <StatCard
          label="Retencion"
          value={`${overview.retentionDays} dias`}
          helper="Politica configurada para limpieza futura."
        />
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-white shadow-sm">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-lg font-semibold">Historial</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Descarga y restore requieren permisos de configuracion avanzada.
          </p>
        </div>

        {overview.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--line)] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                  <th className="py-3 pr-4 pl-5">Backup</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="py-3 pr-5 pl-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {overview.rows.map((backup) => (
                  <tr key={backup.id}>
                    <td className="max-w-[340px] py-3 pr-4 pl-5">
                      <p className="font-medium">{backupScopeLabel(backup.scope)}</p>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {backup.filename ?? backup.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(backup.status)}`}
                      >
                        {backupStatusLabel(backup.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      <p>{backupTriggerLabel(backup.trigger)}</p>
                      <p className="mt-1 text-xs">{backup.createdByName ?? 'Sistema'}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatBackupSize(backup.filesize)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      <p>{dateLabel(backup.startedAt)}</p>
                      <p className="mt-1 text-xs">Fin: {dateLabel(backup.finishedAt)}</p>
                    </td>
                    <td className="py-3 pr-5 pl-4">
                      <Link
                        href={`/dashboard/backups/${backup.id}`}
                        className="font-semibold text-[var(--zift)]"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="No hay backups todavia"
              message="Crea un respaldo manual de la base, media o ambos para dejar protegido el dashboard propio."
            />
          </div>
        )}
      </section>
    </main>
  )
}
