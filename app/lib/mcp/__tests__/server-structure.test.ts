import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db', () => ({ db: {} }));

import { eloaServer } from '../servers/eloa';
import { ottoServer } from '../servers/otto';
import { notaFiscalServer } from '../servers/nota-fiscal';
import { familiaServer } from '../servers/familia';
import { rayssaServer } from '../servers/rayssa';
import type { McpServerDefinition } from '../types';

const servers: McpServerDefinition[] = [
  eloaServer,
  ottoServer,
  notaFiscalServer,
  familiaServer,
  rayssaServer,
];

describe('MCP Server Structure', () => {
  describe('all servers', () => {
    for (const server of servers) {
      it(`${server.name} has name, description, and category`, () => {
        expect(server.name).toBeTruthy();
        expect(server.description.length).toBeGreaterThan(10);
        expect(server.category).toBeTruthy();
      });

      it(`${server.name} has non-empty instructions (>50 chars)`, () => {
        expect(server.instructions).toBeDefined();
        expect(server.instructions!.length).toBeGreaterThan(50);
      });
    }

    it('total tool count is 60', () => {
      const total = servers.reduce((sum, s) => sum + s.tools.length, 0);
      expect(total).toBe(60);
    });
  });

  describe('tool definitions', () => {
    for (const server of servers) {
      it(`${server.name}: tool names are unique`, () => {
        const names = server.tools.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
      });

      it(`${server.name}: every description is >= 80 chars`, () => {
        for (const tool of server.tools) {
          expect(
            tool.description.length,
            `${server.name}/${tool.name} (${tool.description.length} chars)`,
          ).toBeGreaterThanOrEqual(80);
        }
      });
    }

    it('tool count per server', () => {
      const counts: Record<string, number> = {};
      for (const s of servers) counts[s.name] = s.tools.length;
      expect(counts).toEqual({
        eloa: 11,
        otto: 12,
        lucian: 12,
        familia: 15,
        rayssa: 10,
      });
    });
  });

  describe('tool annotations consistency', () => {
    const allTools = servers.flatMap((s) =>
      s.tools.map((t) => ({ server: s.name, ...t })),
    );

    // Match tool names starting with read-like keywords (EN + PT)
    const readOnlyNamePattern = /^(list_|search|read_|view_|listar_|ver_lista)/i;
    // Match tool names starting with destructive keywords (EN + PT)
    const destructiveNamePattern = /^(remove_|delete_|remover_)/i;

    it('tools with read-like names have readOnlyHint', () => {
      for (const tool of allTools) {
        if (readOnlyNamePattern.test(tool.name)) {
          expect(
            tool.annotations?.readOnlyHint,
            `${tool.server}/${tool.name} should have readOnlyHint`,
          ).toBe(true);
        }
      }
    });

    it('tools with destructive names have destructiveHint', () => {
      for (const tool of allTools) {
        if (destructiveNamePattern.test(tool.name)) {
          expect(
            tool.annotations?.destructiveHint,
            `${tool.server}/${tool.name} should have destructiveHint`,
          ).toBe(true);
        }
      }
    });

    it('no tool has both readOnlyHint and destructiveHint', () => {
      for (const tool of allTools) {
        const hasReadOnly = tool.annotations?.readOnlyHint === true;
        const hasDestructive = tool.annotations?.destructiveHint === true;
        expect(
          hasReadOnly && hasDestructive,
          `${tool.server}/${tool.name} has both readOnlyHint and destructiveHint`,
        ).toBe(false);
      }
    });
  });
});
