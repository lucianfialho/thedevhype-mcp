import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extract userId from the MCP tool callback `extra` parameter.
 * The userId is injected in app/api/mcp/[...path]/route.ts via request.auth.
 */
export function getUserId(extra: Record<string, unknown>): string {
  const authInfo = extra?.authInfo as
    | { extra?: { userId?: string } }
    | undefined;
  const userId = authInfo?.extra?.userId;
  if (!userId) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      'Authentication required. Use OAuth (configure your MCP client with just the URL) or provide an API key via Authorization header. Get your API key at https://www.thedevhype.com/onboarding',
    );
  }
  return userId;
}
