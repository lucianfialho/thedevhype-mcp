import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSession, mockGetStripeCustomerId, mockStripe } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockGetStripeCustomerId = vi.fn();
  const mockStripe = {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  };
  return { mockGetSession, mockGetStripeCustomerId, mockStripe };
});

vi.mock('@/app/lib/auth/server', () => ({
  auth: { getSession: mockGetSession },
}));

vi.mock('@/app/lib/billing/stripe', () => ({
  stripe: mockStripe,
}));

vi.mock('@/app/lib/billing/config', () => ({
  PLANS: {
    eloa: {
      name: 'Eloa',
      description: 'Content Curator',
      priceMonthly: 4,
      stripePriceId: 'price_eloa_test',
      mcpNames: ['eloa'],
    },
  },
}));

vi.mock('@/app/lib/billing/subscriptions', () => ({
  getStripeCustomerId: mockGetStripeCustomerId,
}));

import { POST } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: null });

    const response = await POST(makeRequest({ plan: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('should return 401 when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('Auth service down'));

    const response = await POST(makeRequest({ plan: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
  });

  it('should return 400 with invalid plan name', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } },
    });

    const response = await POST(makeRequest({ plan: 'nonexistent' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid plan');
  });

  it('should return 200 with checkout URL for valid plan', async () => {
    mockGetSession.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } },
    });
    mockGetStripeCustomerId.mockResolvedValue('cus_123');
    mockStripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_123',
    });

    const response = await POST(makeRequest({ plan: 'eloa' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.url).toBe('https://checkout.stripe.com/session_123');
  });
});
