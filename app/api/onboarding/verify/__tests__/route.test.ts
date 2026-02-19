import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect } = vi.hoisted(
  () => {
    const mockLimit = vi.fn();
    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockGetSession = vi.fn();
    return { mockGetSession, mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect };
  },
);

vi.mock('@/app/lib/auth/server', () => ({
  auth: { getSession: mockGetSession },
}));

vi.mock('@/app/lib/db', () => ({
  db: { select: mockSelect },
}));

vi.mock('@/app/lib/db/public.schema', () => ({
  mcpToolUsage: {
    mcpName: 'mcpName',
    toolName: 'toolName',
    createdAt: 'createdAt',
    userId: 'userId',
  },
}));

import { GET } from '../route';

describe('GET /api/onboarding/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('should return connected: false when no MCP tool usage found', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockLimit.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connected).toBe(false);
  });

  it('should return connected: true with first call data', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    const date = new Date('2025-01-01');
    mockLimit.mockResolvedValue([
      { mcpName: 'test-mcp', toolName: 'test-tool', createdAt: date },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connected).toBe(true);
    expect(body.mcpName).toBe('test-mcp');
    expect(body.toolName).toBe('test-tool');
    expect(body.firstCallAt).toBe(date.toISOString());
  });

  it('should return 500 when an error occurs', async () => {
    mockGetSession.mockRejectedValue(new Error('DB down'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
