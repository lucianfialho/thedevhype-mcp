import { describe, it, expect } from 'vitest';
import { registry } from '../servers';

describe('McpRegistry', () => {
  it('should register and list servers', () => {
    const servers = registry.listServers();

    expect(servers.length).toBeGreaterThanOrEqual(1);
    expect(servers.find((s) => s.name === 'nota-fiscal')).toBeDefined();
  });

  it('should return undefined for unknown server', () => {
    const handler = registry.getHandler('nonexistent');
    expect(handler).toBeUndefined();
  });

  it('should return a handler for registered server', () => {
    const handler = registry.getHandler('nota-fiscal');
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });
});
