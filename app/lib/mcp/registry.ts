import { createMcpHandler } from 'mcp-handler';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '../db';
import { mcpToolUsage } from '../db/public.schema';
import { getUserId } from './auth-helpers';
import type { McpServerDefinition, McpServerInitFn } from './types';

type Handler = (request: Request) => Promise<Response>;

function wrapInit(serverName: string, originalInit: McpServerInitFn): McpServerInitFn {
  return (server: McpServer) => {
    const originalTool = server.tool.bind(server);

    server.tool = (...args: unknown[]) => {
      const toolName = args[0] as string;
      // Callback is always the last argument
      const cbIndex = args.length - 1;
      const originalCb = args[cbIndex] as (...cbArgs: unknown[]) => Promise<unknown>;

      args[cbIndex] = async (...cbArgs: unknown[]) => {
        const start = Date.now();
        let hasError = false;
        let userId: string | undefined;

        try {
          // extra is always the last arg to the callback
          const extra = cbArgs[cbArgs.length - 1] as Record<string, unknown>;
          try { userId = getUserId(extra); } catch { /* unauthenticated */ }

          return await originalCb(...cbArgs);
        } catch (err) {
          hasError = true;
          throw err;
        } finally {
          if (userId) {
            const durationMs = Date.now() - start;
            db.insert(mcpToolUsage)
              .values({ userId, mcpName: serverName, toolName, durationMs, error: hasError })
              .then(() => {})
              .catch(() => {});
          }
        }
      };

      // @ts-expect-error - pass through to original overloaded method
      return originalTool(...args);
    };

    originalInit(server);
  };
}

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
        wrapInit(name, definition.init),
        {
          capabilities: { tools: {} },
        },
        {
          streamableHttpEndpoint: `/api/mcp/${name}`,
          sseEndpoint: `/api/mcp/${name}/sse`,
          sseMessageEndpoint: `/api/mcp/${name}/message`,
          verboseLogs: true,
        },
      );
      this.handlers.set(name, handler);
    }

    return handler;
  }

  getServer(name: string): McpServerDefinition | undefined {
    return this.servers.get(name);
  }

  listServers(): McpServerDefinition[] {
    return Array.from(this.servers.values());
  }
}

export const registry = new McpRegistry();
