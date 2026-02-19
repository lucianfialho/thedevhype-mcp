import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type McpServerInitFn = (server: McpServer) => void;

export interface McpToolInfo {
  name: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
}

export interface McpServerDefinition {
  name: string;
  description: string;
  category: string;
  icon?: string;
  badge?: string;
  instructions?: string;
  tools: McpToolInfo[];
  init: McpServerInitFn;
}
