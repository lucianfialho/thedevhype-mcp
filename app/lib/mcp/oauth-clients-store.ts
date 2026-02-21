import crypto from 'node:crypto';
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { db } from '../db';
import { mcpOAuthClients } from '../db/public.schema';
import { eq } from 'drizzle-orm';

function rowToClientInfo(row: typeof mcpOAuthClients.$inferSelect): OAuthClientInformationFull {
  return {
    client_id: row.clientId,
    client_secret: row.clientSecret ?? undefined,
    client_secret_expires_at: row.clientSecretExpiresAt ?? undefined,
    redirect_uris: row.redirectUris as string[],
    grant_types: row.grantTypes as string[],
    response_types: row.responseTypes as string[],
    token_endpoint_auth_method: row.tokenEndpointAuthMethod,
    client_name: row.clientName ?? undefined,
    scope: row.scope ?? undefined,
    client_id_issued_at: row.clientIdIssuedAt,
  };
}

export class McpOAuthClientsStore implements OAuthRegisteredClientsStore {
  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    const rows = await db
      .select()
      .from(mcpOAuthClients)
      .where(eq(mcpOAuthClients.clientId, clientId))
      .limit(1);

    if (rows.length === 0) return undefined;

    const row = rows[0];

    // If secret has an expiry and it has passed, treat as invalid
    if (row.clientSecretExpiresAt && row.clientSecretExpiresAt < Math.floor(Date.now() / 1000)) {
      return undefined;
    }

    return rowToClientInfo(row);
  }

  async registerClient(metadata: OAuthClientMetadata): Promise<OAuthClientInformationFull> {
    const clientId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Public clients use 'none', confidential clients get a secret
    const authMethod = metadata.token_endpoint_auth_method ?? 'none';
    const clientSecret = authMethod !== 'none' ? crypto.randomBytes(32).toString('hex') : null;

    const [row] = await db
      .insert(mcpOAuthClients)
      .values({
        clientId,
        clientSecret,
        redirectUris: metadata.redirect_uris as string[],
        grantTypes: (metadata.grant_types ?? ['authorization_code']) as string[],
        responseTypes: (metadata.response_types ?? ['code']) as string[],
        tokenEndpointAuthMethod: authMethod,
        clientName: metadata.client_name ?? null,
        scope: metadata.scope ?? null,
        clientIdIssuedAt: now,
      })
      .returning();

    return rowToClientInfo(row);
  }
}
