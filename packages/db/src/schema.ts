import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

type JsonRecord = Record<string, unknown>

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

const actorColumns = () => ({
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
})

const softDelete = () => ({
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

const payloadId = () => ({
  payloadId: integer('payload_id'),
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 254 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    passwordHash: text('password_hash'),
    status: varchar('status', { length: 40 }).notNull().default('pending'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordUpdatedAt: timestamp('password_updated_at', { withTimezone: true }),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    twoFactorSecretEncrypted: text('two_factor_secret_encrypted'),
    twoFactorConfirmedAt: timestamp('two_factor_confirmed_at', { withTimezone: true }),
    twoFactorRecoveryCodes: jsonb('two_factor_recovery_codes')
      .$type<string[]>()
      .notNull()
      .default([]),
    ...payloadId(),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
)

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    system: boolean('system').notNull().default(false),
    ...timestamps(),
  },
  (table) => [uniqueIndex('roles_slug_idx').on(table.slug)],
)

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    description: text('description'),
    ...timestamps(),
  },
  (table) => [uniqueIndex('permissions_slug_idx').on(table.slug)],
)

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by'),
  },
  (table) => [
    uniqueIndex('role_permissions_role_permission_idx').on(table.roleId, table.permissionId),
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by'),
  },
  (table) => [
    uniqueIndex('user_roles_user_role_idx').on(table.userId, table.roleId),
    index('user_roles_user_id_idx').on(table.userId),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 80 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
  ],
)

export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    type: varchar('type', { length: 40 }).notNull().default('totp'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 80 }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('auth_challenges_token_hash_idx').on(table.tokenHash),
    index('auth_challenges_user_id_idx').on(table.userId),
  ],
)

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 254 }),
    ipAddress: varchar('ip_address', { length: 80 }),
    userAgent: text('user_agent'),
    success: boolean('success').notNull().default(false),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('login_attempts_email_idx').on(table.email),
    index('login_attempts_ip_address_idx').on(table.ipAddress),
    index('login_attempts_attempted_at_idx').on(table.attemptedAt),
  ],
)

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 120 }).notNull(),
  entityType: varchar('entity_type', { length: 120 }),
  entityId: varchar('entity_id', { length: 120 }),
  metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 120 }).notNull(),
  targetType: varchar('target_type', { length: 120 }),
  targetId: varchar('target_id', { length: 120 }),
  before: jsonb('before').$type<JsonRecord>(),
  after: jsonb('after').$type<JsonRecord>(),
  metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: varchar('filename', { length: 255 }).notNull(),
    alt: text('alt').notNull(),
    url: text('url').notNull(),
    mimeType: varchar('mime_type', { length: 120 }),
    filesize: integer('filesize'),
    width: integer('width'),
    height: integer('height'),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [uniqueIndex('media_assets_payload_id_idx').on(table.payloadId)],
)

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    type: varchar('type', { length: 80 }).notNull().default('page'),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    content: jsonb('content').$type<JsonRecord>().notNull().default({}),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('pages_slug_idx').on(table.slug),
    uniqueIndex('pages_payload_id_idx').on(table.payloadId),
  ],
)

export const pageSections = pgTable('page_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
  kind: varchar('kind', { length: 120 }).notNull(),
  position: integer('position').notNull().default(0),
  data: jsonb('data').$type<JsonRecord>().notNull().default({}),
  ...timestamps(),
  ...actorColumns(),
  ...softDelete(),
})

export const pageVersions = pgTable('page_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  data: jsonb('data').$type<JsonRecord>().notNull().default({}),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const seoMetadata = pgTable('seo_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 120 }).notNull(),
  entityId: varchar('entity_id', { length: 120 }).notNull(),
  title: varchar('title', { length: 240 }),
  description: text('description'),
  imageId: uuid('image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
  canonicalUrl: text('canonical_url'),
  noindex: boolean('noindex').notNull().default(false),
  metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
  ...timestamps(),
  ...softDelete(),
})

export const redirects = pgTable(
  'redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromPath: text('from_path').notNull(),
    toPath: text('to_path').notNull(),
    statusCode: integer('status_code').notNull().default(301),
    active: boolean('active').notNull().default(true),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('redirects_from_path_idx').on(table.fromPath),
    uniqueIndex('redirects_payload_id_idx').on(table.payloadId),
  ],
)

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    excerpt: text('excerpt').notNull(),
    content: jsonb('content').$type<JsonRecord>().notNull().default({}),
    features: jsonb('features').$type<JsonRecord[]>().notNull().default([]),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    order: integer('order').notNull().default(0),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('services_slug_idx').on(table.slug),
    uniqueIndex('services_payload_id_idx').on(table.payloadId),
  ],
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    excerpt: text('excerpt').notNull(),
    content: jsonb('content').$type<JsonRecord>().notNull().default({}),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    completedAt: date('completed_at'),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('projects_slug_idx').on(table.slug),
    uniqueIndex('projects_payload_id_idx').on(table.payloadId),
  ],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    description: text('description'),
    ...payloadId(),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('categories_slug_idx').on(table.slug),
    uniqueIndex('categories_payload_id_idx').on(table.payloadId),
  ],
)

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    title: varchar('title', { length: 240 }).notNull(),
    excerpt: text('excerpt').notNull(),
    content: jsonb('content').$type<JsonRecord>().notNull().default({}),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('posts_slug_idx').on(table.slug),
    uniqueIndex('posts_payload_id_idx').on(table.payloadId),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [uniqueIndex('tags_slug_idx').on(table.slug)],
)

export const postTags = pgTable(
  'post_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('post_tags_post_tag_idx').on(table.postId, table.tagId)],
)

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 254 }).notNull(),
    phone: varchar('phone', { length: 80 }),
    company: varchar('company', { length: 200 }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    budget: varchar('budget', { length: 80 }),
    message: text('message'),
    formType: varchar('form_type', { length: 80 }).notNull(),
    source: text('source'),
    utm: jsonb('utm').$type<JsonRecord>().notNull().default({}),
    status: varchar('status', { length: 40 }).notNull().default('new'),
    payload: jsonb('payload').$type<JsonRecord>().notNull().default({}),
    ...payloadId(),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [uniqueIndex('leads_payload_id_idx').on(table.payloadId)],
)

export const leadNotes = pgTable('lead_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  authorId: uuid('author_id'),
  ...timestamps(),
  ...softDelete(),
})

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    enabled: boolean('enabled').notNull().default(false),
    config: jsonb('config').$type<JsonRecord>().notNull().default({}),
    ...timestamps(),
    ...actorColumns(),
  },
  (table) => [uniqueIndex('integrations_key_idx').on(table.key)],
)

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: varchar('event_name', { length: 160 }).notNull(),
  source: varchar('source', { length: 120 }),
  payload: jsonb('payload').$type<JsonRecord>().notNull().default({}),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
})

export const performanceChecks = pgTable('performance_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  score: integer('score'),
  metrics: jsonb('metrics').$type<JsonRecord>().notNull().default({}),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body'),
  readAt: timestamp('read_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
  ...timestamps(),
})

export const backups = pgTable('backups', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: varchar('kind', { length: 80 }).notNull(),
  status: varchar('status', { length: 80 }).notNull().default('pending'),
  location: text('location'),
  metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
})

export const siteSettings = pgTable(
  'site_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 120 }).notNull(),
    value: jsonb('value').$type<JsonRecord>().notNull().default({}),
    ...timestamps(),
  },
  (table) => [uniqueIndex('site_settings_key_idx').on(table.key)],
)

export type User = typeof users.$inferSelect
export type Role = typeof roles.$inferSelect
export type Permission = typeof permissions.$inferSelect
export type RolePermission = typeof rolePermissions.$inferSelect
export type Session = typeof sessions.$inferSelect
export type AuthChallenge = typeof authChallenges.$inferSelect
export type LoginAttempt = typeof loginAttempts.$inferSelect
export type MediaAsset = typeof mediaAssets.$inferSelect
export type Page = typeof pages.$inferSelect
export type Service = typeof services.$inferSelect
export type Project = typeof projects.$inferSelect
export type Post = typeof posts.$inferSelect
export type Lead = typeof leads.$inferSelect
export type SiteSetting = typeof siteSettings.$inferSelect
