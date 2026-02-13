import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type McpServerInitFn = (server: McpServer) => void;

export interface McpToolInfo {
  name: string;
  description: string;
}

export interface McpServerDefinition {
  name: string;
  description: string;
  category: string;
  tools: McpToolInfo[];
  init: McpServerInitFn;
}
