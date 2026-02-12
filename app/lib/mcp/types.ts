import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type McpServerInitFn = (server: McpServer) => void;

export interface McpServerDefinition {
  name: string;
  description: string;
  init: McpServerInitFn;
}
