import 'server-only'

import { db, integrationLogs, integrations } from '@ziftlab/db'
import { desc, eq, inArray } from 'drizzle-orm'

import { envStateForIntegration, integrationHasRequiredEnv } from './env'
import {
  integrationByKey,
  integrationRegistry,
  type IntegrationEnvironment,
  type IntegrationStatus,
} from './registry'

export interface IntegrationOverviewItem {
  authType: string
  capabilities: string[]
  category: string
  config: Record<string, unknown>
  docsUrl: string
  enabled: boolean
  environment: IntegrationEnvironment
  env: ReturnType<typeof envStateForIntegration>
  id: string | null
  key: string
  lastCheckedAt: Date | null
  lastError: string | null
  metadata: Record<string, unknown>
  name: string
  notes: string
  provider: string
  status: IntegrationStatus
  testStrategy: string
}

export interface IntegrationLogItem {
  action: string
  createdAt: Date
  id: string
  integrationKey: string
  level: string
  message: string | null
  metadata: Record<string, unknown>
  status: string
}

function defaultStatus(key: string): IntegrationStatus {
  const integration = integrationByKey(key)
  if (!integration) return 'not_configured'
  return integrationHasRequiredEnv(integration) ? 'configured' : 'not_configured'
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function getIntegrationOverview(): Promise<IntegrationOverviewItem[]> {
  const rows = await db
    .select()
    .from(integrations)
    .where(
      inArray(
        integrations.key,
        integrationRegistry.map((integration) => integration.key),
      ),
    )

  const rowsByKey = new Map(rows.map((row) => [row.key, row]))

  return integrationRegistry.map((registryItem) => {
    const row = rowsByKey.get(registryItem.key)
    return {
      authType: registryItem.authType,
      capabilities: registryItem.capabilities,
      category: registryItem.category,
      config: toRecord(row?.config),
      docsUrl: row?.docsUrl || registryItem.docsUrl,
      enabled: row?.enabled ?? false,
      environment: (row?.environment === 'sandbox' ? 'sandbox' : 'live') as IntegrationEnvironment,
      env: envStateForIntegration(registryItem),
      id: row?.id ?? null,
      key: registryItem.key,
      lastCheckedAt: row?.lastCheckedAt ?? null,
      lastError: row?.lastError ?? null,
      metadata: toRecord(row?.metadata),
      name: row?.name || registryItem.name,
      notes: registryItem.notes,
      provider: row?.provider || registryItem.provider,
      status: (row?.status as IntegrationStatus | undefined) ?? defaultStatus(registryItem.key),
      testStrategy: registryItem.testStrategy,
    }
  })
}

export async function getRecentIntegrationLogs(limit = 30): Promise<IntegrationLogItem[]> {
  const rows = await db
    .select()
    .from(integrationLogs)
    .orderBy(desc(integrationLogs.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    action: row.action,
    createdAt: row.createdAt,
    id: row.id,
    integrationKey: row.integrationKey,
    level: row.level,
    message: row.message,
    metadata: toRecord(row.metadata),
    status: row.status,
  }))
}

export async function getIntegrationRecord(key: string) {
  return db.query.integrations.findFirst({ where: eq(integrations.key, key) })
}

export async function upsertIntegrationRecord(input: {
  config?: Record<string, unknown>
  enabled?: boolean
  environment?: IntegrationEnvironment
  key: string
  lastCheckedAt?: Date | null
  lastError?: string | null
  metadata?: Record<string, unknown>
  status?: IntegrationStatus
  updatedBy?: string | null
}) {
  const registryItem = integrationByKey(input.key)
  if (!registryItem) throw new Error('integration')
  const existing = await getIntegrationRecord(input.key)
  const existingEnvironment = existing?.environment === 'sandbox' ? 'sandbox' : 'live'
  const existingStatus = existing?.status as IntegrationStatus | undefined

  const values = {
    category: registryItem.category,
    config: { ...toRecord(existing?.config), ...(input.config ?? {}) },
    docsUrl: registryItem.docsUrl,
    enabled: input.enabled ?? existing?.enabled ?? false,
    environment: input.environment ?? existingEnvironment,
    key: registryItem.key,
    lastCheckedAt:
      input.lastCheckedAt === undefined ? (existing?.lastCheckedAt ?? null) : input.lastCheckedAt,
    lastError: input.lastError === undefined ? (existing?.lastError ?? null) : input.lastError,
    metadata: { ...toRecord(existing?.metadata), ...(input.metadata ?? {}) },
    name: registryItem.name,
    provider: registryItem.provider,
    status: input.status ?? existingStatus ?? defaultStatus(input.key),
    updatedAt: new Date(),
    updatedBy: input.updatedBy ?? null,
  }

  await db
    .insert(integrations)
    .values(values)
    .onConflictDoUpdate({
      target: integrations.key,
      set: {
        category: values.category,
        config: values.config,
        docsUrl: values.docsUrl,
        enabled: values.enabled,
        environment: values.environment,
        lastCheckedAt: values.lastCheckedAt,
        lastError: values.lastError,
        metadata: values.metadata,
        name: values.name,
        provider: values.provider,
        status: values.status,
        updatedAt: values.updatedAt,
        updatedBy: values.updatedBy,
      },
    })
}

export async function recordIntegrationLog(input: {
  action: string
  createdBy?: string | null
  integrationKey: string
  level?: 'error' | 'info' | 'warn'
  message?: string | null
  metadata?: Record<string, unknown>
  requestId?: string | null
  status?: 'failed' | 'ok' | 'skipped'
}) {
  const record = await getIntegrationRecord(input.integrationKey)
  await db.insert(integrationLogs).values({
    action: input.action,
    createdBy: input.createdBy ?? null,
    integrationId: record?.id ?? null,
    integrationKey: input.integrationKey,
    level: input.level ?? 'info',
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    requestId: input.requestId ?? null,
    status: input.status ?? 'ok',
  })
}
