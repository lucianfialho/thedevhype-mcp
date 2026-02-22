import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, infoBox, PRODUCT_COLORS } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface SubscriptionActiveProps {
  name: string;
  planName: string;
  planDescription: string;
  priceMonthly: number;
}

export function SubscriptionActive({ name, planName, planDescription, priceMonthly }: SubscriptionActiveProps) {
  return (
    <BaseLayout preview={`Your ${planName} subscription is active`}>
      <Text style={heading}>Subscription confirmed!</Text>
      <Text style={paragraph}>
        Hey {name}, your subscription is now active. Your MCP servers are ready to use.
      </Text>
      <Text style={infoBox}>
        <strong style={{ color: PRODUCT_COLORS.slate800 }}>{planName}</strong>
        <br />
        {planDescription}
        <br />
        <span style={{ color: PRODUCT_COLORS.slate500, fontSize: '12px' }}>
          ${priceMonthly}/month
        </span>
      </Text>
      <Section style={{ textAlign: 'center' as const }}>
        <Link href={`${BASE_URL}/dashboard`} style={ctaButton}>
          Go to Dashboard
        </Link>
      </Section>
    </BaseLayout>
  );
}
