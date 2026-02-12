import { createMcpHandler } from 'mcp-handler';
import type { McpServerDefinition } from './types';

type Handler = (request: Request) => Promise<Response>;

class McpRegistry {
  private servers = new Map<string, McpServerDefinition>();
  private handlers = new Map<string, Handler>();

  register(definition: McpServerDefinition) {
    this.servers.set(definition.name, definition);
  }

  getHandler(name: string): Handler | undefined {
    const definition = this.servers.get(name);
    if (!definition) return undefined;

    let handler = this.handlers.get(name);
    if (!handler) {
      handler = createMcpHandler(
        definition.init,
        {
          capabilities: { tools: {} },
        },
        {
          basePath: `/api/mcp/${name}`,
          verboseLogs: true,
        },
      );
      this.handlers.set(name, handler);
    }

    return handler;
  }

  listServers(): McpServerDefinition[] {
    return Array.from(this.servers.values());
  }
}

export const registry = new McpRegistry();
