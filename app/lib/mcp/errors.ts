import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Protocol-level error for invalid input the LLM can fix by retrying
 * with corrected parameters. Throws McpError with InvalidParams code.
 */
export function invalidParams(message: string, recovery?: string): never {
  throw new McpError(
    ErrorCode.InvalidParams,
    recovery ? `${message}\n<recovery>${recovery}</recovery>` : message,
  );
}

/**
 * Business-logic error returned as a tool result with isError: true.
 * Use for "not found", "limit reached", "invalid data" cases where the
 * LLM should understand what went wrong and adjust its approach.
 */
export function toolError(message: string, recovery?: string): CallToolResult {
  const text = recovery
    ? `<error>${message}</error>\n<recovery>${recovery}</recovery>`
    : `<error>${message}</error>`;
  return { content: [{ type: 'text', text }], isError: true };
}

/**
 * Internal failure (DB down, external API unreachable).
 * Throws McpError with InternalError code.
 */
export function internalError(message: string): never {
  throw new McpError(ErrorCode.InternalError, message);
}
