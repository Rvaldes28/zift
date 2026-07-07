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
    revokedBy: uuid('revoked_by'),
    revocationReason: varchar('revocation_reason', { length: 120 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_last_seen_at_idx').on(table.lastSeenAt),
    index('sessions_revoked_at_idx').on(table.revokedAt),
  ],
)

export const securityIpBlocks = pgTable(
  'security_ip_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ipAddress: varchar('ip_address', { length: 80 }).notNull(),
    reason: text('reason').notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by'),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    ...timestamps(),
  },
  (table) => [
    index('security_ip_blocks_ip_address_idx').on(table.ipAddress),
    index('security_ip_blocks_blocked_until_idx').on(table.blockedUntil),
    index('security_ip_blocks_created_by_idx').on(table.createdBy),
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
    storageKey: text('storage_key'),
    bucket: varchar('bucket', { length: 160 }),
    caption: text('caption'),
    folderPath: varchar('folder_path', { length: 260 }).notNull().default('/'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    status: varchar('status', { length: 40 }).notNull().default('active'),
    mimeType: varchar('mime_type', { length: 120 }),
    filesize: integer('filesize'),
    width: integer('width'),
    height: integer('height'),
    checksum: varchar('checksum', { length: 128 }),
    replacedAt: timestamp('replaced_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
    deletedBy: uuid('deleted_by'),
    deletedReason: text('deleted_reason'),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('media_assets_payload_id_idx').on(table.payloadId),
    uniqueIndex('media_assets_storage_key_idx').on(table.storageKey),
    index('media_assets_folder_path_idx').on(table.folderPath),
    index('media_assets_status_idx').on(table.status),
    index('media_assets_mime_type_idx').on(table.mimeType),
    index('media_assets_created_at_idx').on(table.createdAt),
  ],
)

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 220 }).notNull(),
    routePath: varchar('route_path', { length: 260 }).notNull().default('/'),
    title: varchar('title', { length: 240 }).notNull(),
    excerpt: text('excerpt'),
    type: varchar('type', { length: 80 }).notNull().default('page'),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    content: jsonb('content').$type<JsonRecord>().notNull().default({}),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    currentVersionId: uuid('current_version_id'),
    publishedVersionId: uuid('published_version_id'),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('pages_slug_idx').on(table.slug),
    uniqueIndex('pages_route_path_idx').on(table.routePath),
    uniqueIndex('pages_payload_id_idx').on(table.payloadId),
    index('pages_status_idx').on(table.status),
    index('pages_type_idx').on(table.type),
  ],
)

export const pageSections = pgTable(
  'page_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 120 }).notNull(),
    label: varchar('label', { length: 160 }).notNull().default('Seccion'),
    enabled: boolean('enabled').notNull().default(true),
    position: integer('position').notNull().default(0),
    data: jsonb('data').$type<JsonRecord>().notNull().default({}),
    settings: jsonb('settings').$type<JsonRecord>().notNull().default({}),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    index('page_sections_page_id_idx').on(table.pageId),
    index('page_sections_position_idx').on(table.position),
  ],
)

export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    data: jsonb('data').$type<JsonRecord>().notNull().default({}),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('page_versions_page_version_idx').on(table.pageId, table.version),
    index('page_versions_page_id_idx').on(table.pageId),
  ],
)

export const seoMetadata = pgTable(
  'seo_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 120 }).notNull(),
    entityId: varchar('entity_id', { length: 120 }).notNull(),
    title: varchar('title', { length: 240 }),
    description: text('description'),
    imageId: uuid('image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    canonicalUrl: text('canonical_url'),
    ogTitle: varchar('og_title', { length: 140 }),
    ogDescription: text('og_description'),
    ogImageId: uuid('og_image_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    schemaJsonLd: jsonb('schema_json_ld').$type<JsonRecord | JsonRecord[]>(),
    robotsDirectives: jsonb('robots_directives').$type<string[]>().notNull().default([]),
    sitemapInclude: boolean('sitemap_include').notNull().default(true),
    noindex: boolean('noindex').notNull().default(false),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('seo_metadata_entity_idx').on(table.entityType, table.entityId),
    index('seo_metadata_entity_type_idx').on(table.entityType),
    index('seo_metadata_noindex_idx').on(table.noindex),
    index('seo_metadata_sitemap_include_idx').on(table.sitemapInclude),
  ],
)

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
    index('redirects_active_idx').on(table.active),
    index('redirects_status_code_idx').on(table.statusCode),
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
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    coverImageId: uuid('cover_image_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 40 }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...payloadId(),
    ...timestamps(),
    ...actorColumns(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('posts_slug_idx').on(table.slug),
    uniqueIndex('posts_payload_id_idx').on(table.payloadId),
    index('posts_author_id_idx').on(table.authorId),
    index('posts_cover_image_id_idx').on(table.coverImageId),
    index('posts_status_idx').on(table.status),
    index('posts_published_at_idx').on(table.publishedAt),
    index('posts_scheduled_at_idx').on(table.scheduledAt),
  ],
)

export const postCategories = pgTable(
  'post_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    uniqueIndex('post_categories_post_category_idx').on(table.postId, table.categoryId),
    index('post_categories_post_id_idx').on(table.postId),
    index('post_categories_category_id_idx').on(table.categoryId),
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

export const postRelatedPosts = pgTable(
  'post_related_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    relatedPostId: uuid('related_post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    uniqueIndex('post_related_posts_post_related_idx').on(table.postId, table.relatedPostId),
    index('post_related_posts_post_id_idx').on(table.postId),
    index('post_related_posts_related_post_id_idx').on(table.relatedPostId),
  ],
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
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    budget: varchar('budget', { length: 80 }),
    message: text('message'),
    formType: varchar('form_type', { length: 80 }).notNull(),
    source: text('source'),
    utm: jsonb('utm').$type<JsonRecord>().notNull().default({}),
    analyticsSessionIdHash: varchar('analytics_session_id_hash', { length: 128 }),
    landingPath: text('landing_path'),
    referrer: text('referrer'),
    deviceType: varchar('device_type', { length: 40 }),
    status: varchar('status', { length: 40 }).notNull().default('new'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    crmStatus: varchar('crm_status', { length: 40 }),
    crmSentAt: timestamp('crm_sent_at', { withTimezone: true }),
    crmResponse: jsonb('crm_response').$type<JsonRecord>(),
    notificationSentAt: timestamp('notification_sent_at', { withTimezone: true }),
    ipAddress: varchar('ip_address', { length: 80 }),
    userAgent: text('user_agent'),
    spamReason: text('spam_reason'),
    payload: jsonb('payload').$type<JsonRecord>().notNull().default({}),
    ...payloadId(),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [
    uniqueIndex('leads_payload_id_idx').on(table.payloadId),
    index('leads_status_idx').on(table.status),
    index('leads_created_at_idx').on(table.createdAt),
    index('leads_assigned_to_idx').on(table.assignedTo),
    index('leads_service_id_idx').on(table.serviceId),
    index('leads_form_type_idx').on(table.formType),
    index('leads_email_idx').on(table.email),
    index('leads_analytics_session_id_hash_idx').on(table.analyticsSessionIdHash),
    index('leads_landing_path_idx').on(table.landingPath),
  ],
)

export const leadNotes = pgTable(
  'lead_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
    ...softDelete(),
  },
  (table) => [
    index('lead_notes_lead_id_idx').on(table.leadId),
    index('lead_notes_author_id_idx').on(table.authorId),
  ],
)

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

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventName: varchar('event_name', { length: 160 }).notNull(),
    path: text('path'),
    title: text('title'),
    referrer: text('referrer'),
    source: varchar('source', { length: 120 }),
    utm: jsonb('utm').$type<JsonRecord>().notNull().default({}),
    sessionIdHash: varchar('session_id_hash', { length: 128 }),
    visitorIdHash: varchar('visitor_id_hash', { length: 128 }),
    deviceType: varchar('device_type', { length: 40 }),
    browser: varchar('browser', { length: 80 }),
    os: varchar('os', { length: 80 }),
    country: varchar('country', { length: 120 }),
    city: varchar('city', { length: 160 }),
    durationMs: integer('duration_ms'),
    payload: jsonb('payload').$type<JsonRecord>().notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('analytics_events_event_name_idx').on(table.eventName),
    index('analytics_events_occurred_at_idx').on(table.occurredAt),
    index('analytics_events_path_idx').on(table.path),
    index('analytics_events_source_idx').on(table.source),
    index('analytics_events_session_id_hash_idx').on(table.sessionIdHash),
    index('analytics_events_country_idx').on(table.country),
    index('analytics_events_city_idx').on(table.city),
    index('analytics_events_device_type_idx').on(table.deviceType),
  ],
)

export const performanceChecks = pgTable(
  'performance_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: varchar('kind', { length: 80 }).notNull().default('synthetic'),
    status: varchar('status', { length: 40 }).notNull().default('pending'),
    url: text('url').notNull(),
    method: varchar('method', { length: 12 }).notNull().default('GET'),
    httpStatus: integer('http_status'),
    responseTimeMs: integer('response_time_ms'),
    cacheStatus: varchar('cache_status', { length: 160 }),
    cdnStatus: varchar('cdn_status', { length: 160 }),
    errorMessage: text('error_message'),
    score: integer('score'),
    metrics: jsonb('metrics').$type<JsonRecord>().notNull().default({}),
    checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('performance_checks_kind_idx').on(table.kind),
    index('performance_checks_status_idx').on(table.status),
    index('performance_checks_url_idx').on(table.url),
    index('performance_checks_response_time_ms_idx').on(table.responseTimeMs),
    index('performance_checks_checked_at_idx').on(table.checkedAt),
  ],
)

export const performanceAlerts = pgTable(
  'performance_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    severity: varchar('severity', { length: 40 }).notNull().default('warning'),
    status: varchar('status', { length: 40 }).notNull().default('open'),
    title: varchar('title', { length: 240 }).notNull(),
    message: text('message').notNull(),
    url: text('url'),
    metric: varchar('metric', { length: 120 }),
    value: integer('value'),
    threshold: integer('threshold'),
    source: varchar('source', { length: 120 }).notNull().default('performance'),
    metadata: jsonb('metadata').$type<JsonRecord>().notNull().default({}),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    index('performance_alerts_severity_idx').on(table.severity),
    index('performance_alerts_status_idx').on(table.status),
    index('performance_alerts_source_idx').on(table.source),
    index('performance_alerts_url_idx').on(table.url),
    index('performance_alerts_metric_idx').on(table.metric),
    index('performance_alerts_last_seen_at_idx').on(table.lastSeenAt),
  ],
)

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
export type SecurityIpBlock = typeof securityIpBlocks.$inferSelect
export type AuthChallenge = typeof authChallenges.$inferSelect
export type LoginAttempt = typeof loginAttempts.$inferSelect
export type MediaAsset = typeof mediaAssets.$inferSelect
export type Page = typeof pages.$inferSelect
export type PageSection = typeof pageSections.$inferSelect
export type PageVersion = typeof pageVersions.$inferSelect
export type Service = typeof services.$inferSelect
export type Project = typeof projects.$inferSelect
export type Post = typeof posts.$inferSelect
export type PostCategory = typeof postCategories.$inferSelect
export type Tag = typeof tags.$inferSelect
export type PostTag = typeof postTags.$inferSelect
export type PostRelatedPost = typeof postRelatedPosts.$inferSelect
export type Lead = typeof leads.$inferSelect
export type PerformanceAlert = typeof performanceAlerts.$inferSelect
export type PerformanceCheck = typeof performanceChecks.$inferSelect
export type SiteSetting = typeof siteSettings.$inferSelect
