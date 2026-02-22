import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockLimit,
  mockWhere,
  mockFrom,
  mockSelect,
  mockSet,
  mockUpdate,
} = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockSet = vi.fn(() => ({ where: vi.fn() }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockGetSession = vi.fn();
  return {
    mockGetSession,
    mockLimit,
    mockWhere,
    mockFrom,
    mockSelect,
    mockSet,
    mockUpdate,
  };
});

vi.mock('@/app/lib/auth/server', () => ({
  auth: { getSession: mockGetSession },
}));

vi.mock('@/app/lib/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

vi.mock('@/app/lib/db/public.schema', () => ({
  userMcpAccess: {
    userId: 'userId',
    mcpName: 'mcpName',
    enabled: 'enabled',
    apiKey: 'apiKey',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
}));

import { POST } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/mcp-access/generate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/mcp-access/generate-key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('should return 401 when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const response = await POST(makeRequest({ mcpName: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('should return 401 when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Auth service down'));

    const response = await POST(makeRequest({ mcpName: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Not authenticated');
  });

  it('should return 400 when server is not enabled', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockLimit.mockResolvedValue([]);

    const response = await POST(makeRequest({ mcpName: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Server must be enabled to generate a key');
  });

  it('should return 200 with generated apiKey', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockLimit.mockResolvedValue([{ enabled: true }]);
    mockSet.mockReturnValue({ where: vi.fn() });

    const response = await POST(makeRequest({ mcpName: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.apiKey).toMatch(/^sk-/);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
