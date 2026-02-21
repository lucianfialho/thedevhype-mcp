import {
  pgSchema,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
  bigint,
  integer,
  smallint,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const neonAuth = pgSchema('neon_auth');

export const userInNeonAuth = neonAuth.table(
  'user',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    role: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [unique('user_email_key').on(table.email)],
);

// --- public schema tables ---

export const userMcpAccess = pgTable(
  'user_mcp_access',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    mcpName: text().notNull(),
    apiKey: text(),
    enabled: boolean().default(true).notNull(),
    contributePublicData: boolean().default(false).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('user_mcp_access_user_mcp').on(table.userId, table.mcpName)],
);

export type UserMcpAccess = InferSelectModel<typeof userMcpAccess>;
export type NewUserMcpAccess = InferInsertModel<typeof userMcpAccess>;

// --- API keys for public API ---

export const apiKeys = pgTable('api_keys', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid().references(() => userInNeonAuth.id),
  key: text().notNull().unique(),
  name: text().notNull(),
  email: text().notNull(),
  tier: text().default('free').notNull(),
  rateLimit: integer().default(100).notNull(),
  dailyLimit: integer().default(1000).notNull(),
  requestsToday: integer().default(0).notNull(),
  requestsThisHour: integer().default(0).notNull(),
  lastRequestAt: timestamp({ withTimezone: true, mode: 'string' }),
  defaultState: text(),
  enabled: boolean().default(true).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;

// --- API usage log ---

export const apiUsageLog = pgTable('api_usage_log', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  apiKeyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => apiKeys.id),
  endpoint: text().notNull(),
  method: text().notNull(),
  statusCode: smallint().notNull(),
  responseTimeMs: integer(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type ApiUsageLog = InferSelectModel<typeof apiUsageLog>;
export type NewApiUsageLog = InferInsertModel<typeof apiUsageLog>;

// --- MCP tool usage log ---

export const mcpToolUsage = pgTable('mcp_tool_usage', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  mcpName: text().notNull(),
  toolName: text().notNull(),
  durationMs: integer(),
  error: boolean().default(false).notNull(),
  errorCode: text(),
  errorMessage: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type McpToolUsage = InferSelectModel<typeof mcpToolUsage>;
export type NewMcpToolUsage = InferInsertModel<typeof mcpToolUsage>;

// --- User profiles (onboarding state) ---

export const userProfiles = pgTable('user_profiles', {
  userId: uuid().primaryKey().references(() => userInNeonAuth.id),
  onboardingCompletedAt: timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type UserProfile = InferSelectModel<typeof userProfiles>;
export type NewUserProfile = InferInsertModel<typeof userProfiles>;

// --- Waitlist ---

export const waitlist = pgTable('waitlist', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid().notNull().references(() => userInNeonAuth.id).unique(),
  building: text().notNull(),
  aiTools: text().notNull(),
  mcpExcitement: text(),
  status: text().default('pending').notNull(), // pending | approved | rejected
  approvedAt: timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Waitlist = InferSelectModel<typeof waitlist>;
export type NewWaitlist = InferInsertModel<typeof waitlist>;

// --- MCP OAuth: Dynamic Client Registration (RFC 7591) ---

export const mcpOAuthClients = pgTable('mcp_oauth_clients', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clientId: text().notNull().unique(),
  clientSecret: text(),
  clientSecretExpiresAt: integer(),
  redirectUris: text().array().notNull(),
  grantTypes: text().array().notNull(),
  responseTypes: text().array().notNull(),
  tokenEndpointAuthMethod: text().notNull(),
  clientName: text(),
  scope: text(),
  clientIdIssuedAt: integer().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type McpOAuthClient = InferSelectModel<typeof mcpOAuthClients>;
export type NewMcpOAuthClient = InferInsertModel<typeof mcpOAuthClients>;

// --- MCP OAuth: Authorization Codes ---

export const mcpOAuthCodes = pgTable('mcp_oauth_codes', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clientId: text().notNull(),
  userId: uuid().notNull().references(() => userInNeonAuth.id),
  code: text().notNull().unique(),
  codeChallenge: text().notNull(),
  redirectUri: text().notNull(),
  scopes: text(),
  resource: text(),
  expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  used: boolean().default(false).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type McpOAuthCode = InferSelectModel<typeof mcpOAuthCodes>;
export type NewMcpOAuthCode = InferInsertModel<typeof mcpOAuthCodes>;

// --- MCP OAuth: Access & Refresh Tokens ---

export const mcpOAuthTokens = pgTable('mcp_oauth_tokens', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clientId: text().notNull(),
  userId: uuid().notNull().references(() => userInNeonAuth.id),
  accessToken: text().notNull().unique(),
  refreshToken: text().unique(),
  scopes: text(),
  resource: text(),
  expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  revokedAt: timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type McpOAuthToken = InferSelectModel<typeof mcpOAuthTokens>;
export type NewMcpOAuthToken = InferInsertModel<typeof mcpOAuthTokens>;
