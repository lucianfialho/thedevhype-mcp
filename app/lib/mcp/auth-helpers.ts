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
    throw new Error('Usuário não autenticado');
  }
  return userId;
}
