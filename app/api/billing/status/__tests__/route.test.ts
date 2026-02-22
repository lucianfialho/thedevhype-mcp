import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockIsGrandfathered, mockGetUserSubscriptions } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockIsGrandfathered = vi.fn();
  const mockGetUserSubscriptions = vi.fn();
  return { mockGetSession, mockIsGrandfathered, mockGetUserSubscriptions };
});

vi.mock('@/app/lib/auth/server', () => ({
  auth: { getSession: mockGetSession },
}));

vi.mock('@/app/lib/billing/subscriptions', () => ({
  isGrandfathered: mockIsGrandfathered,
  getUserSubscriptions: mockGetUserSubscriptions,
}));

import { GET } from '../route';

describe('GET /api/billing/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('should return 401 when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Auth service down'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('should return 200 with grandfathered and subscriptions data', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    });
    mockIsGrandfathered.mockResolvedValue(true);
    mockGetUserSubscriptions.mockResolvedValue([
      {
        plan: 'eloa',
        status: 'active',
        currentPeriodEnd: '2026-03-01',
        cancelAtPeriodEnd: false,
      },
      {
        plan: 'otto',
        status: 'canceled',
        currentPeriodEnd: '2026-02-15',
        cancelAtPeriodEnd: true,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.grandfathered).toBe(true);
    expect(body.subscriptions).toEqual(['eloa']);
    expect(body.allSubscriptions).toHaveLength(2);
    expect(body.allSubscriptions[0].plan).toBe('eloa');
    expect(body.allSubscriptions[0].status).toBe('active');
  });
});
