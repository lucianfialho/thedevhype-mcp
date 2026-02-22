import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, PRODUCT_COLORS } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface PaymentFailedProps {
  name: string;
  planName: string;
}

export function PaymentFailed({ name, planName }: PaymentFailedProps) {
  return (
    <BaseLayout preview="Action required: payment failed">
      <Text style={alertBadge}>Action required</Text>
      <Text style={heading}>Payment failed</Text>
      <Text style={paragraph}>
        Hey {name}, we were unable to process the payment for
        your <strong>{planName}</strong> subscription.
      </Text>
      <Text style={paragraph}>
        Please update your payment method to keep your subscription active
        and avoid losing access to your MCP servers.
      </Text>
      <Section style={{ textAlign: 'center' as const, margin: '8px 0 0' }}>
        <Link href={`${BASE_URL}/dashboard/billing`} style={ctaButton}>
          Update Payment
        </Link>
      </Section>
    </BaseLayout>
  );
}

const alertBadge: React.CSSProperties = {
  fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  color: PRODUCT_COLORS.red500,
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '3px 10px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
