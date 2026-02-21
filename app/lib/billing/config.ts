export type PlanName = 'eloa' | 'otto' | 'familia' | 'rayssa' | 'lucian' | 'bundle';

export interface PlanConfig {
  name: string;
  description: string;
  priceMonthly: number;
  stripePriceId: string;
  mcpNames: string[];
}

export const PLANS: Record<PlanName, PlanConfig> = {
  eloa: {
    name: 'Eloa',
    description: 'Content Curator — curate articles, manage sources, and track reading.',
    priceMonthly: 4,
    stripePriceId: process.env.STRIPE_PRICE_ELOA || '',
    mcpNames: ['eloa'],
  },
  otto: {
    name: 'Otto',
    description: 'Second Brain — store notes, manage tasks, and organize knowledge.',
    priceMonthly: 4,
    stripePriceId: process.env.STRIPE_PRICE_OTTO || '',
    mcpNames: ['otto'],
  },
  familia: {
    name: 'Familia',
    description: 'Shared Workspace — manage family expenses, tasks, and shopping lists.',
    priceMonthly: 4,
    stripePriceId: process.env.STRIPE_PRICE_FAMILIA || '',
    mcpNames: ['familia'],
  },
  rayssa: {
    name: 'Rayssa',
    description: 'Social Publisher — schedule posts and manage social media accounts.',
    priceMonthly: 7,
    stripePriceId: process.env.STRIPE_PRICE_RAYSSA || '',
    mcpNames: ['rayssa'],
  },
  lucian: {
    name: 'Lucian',
    description: 'Grocery Manager — parse receipts, track prices, and manage shopping lists. Includes 50 NFC-e extractions/month.',
    priceMonthly: 9,
    stripePriceId: process.env.STRIPE_PRICE_LUCIAN || '',
    mcpNames: ['lucian'],
  },
  bundle: {
    name: 'Bundle',
    description: 'All 5 MCP tools at 50% off. Includes everything from every individual plan.',
    priceMonthly: 14,
    stripePriceId: process.env.STRIPE_PRICE_BUNDLE || '',
    mcpNames: ['eloa', 'otto', 'familia', 'rayssa', 'lucian'],
  },
};

/** Reverse-lookup: find plan name from a Stripe price ID */
export function planFromPriceId(priceId: string): PlanName | undefined {
  for (const [name, config] of Object.entries(PLANS)) {
    if (config.stripePriceId === priceId) return name as PlanName;
  }
  return undefined;
}

export const LUCIAN_LIMITS = {
  free: 10,
  subscribed: 50,
} as const;

/** Users approved before this date keep free access */
export const BILLING_LAUNCH_DATE = new Date('2025-07-01T00:00:00Z');
