import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, PRODUCT_COLORS } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface WaitlistApprovedProps {
  name: string;
}

export function WaitlistApproved({ name }: WaitlistApprovedProps) {
  return (
    <BaseLayout preview="You're in! Your TheDevHype account is ready">
      <Text style={badge}>Approved</Text>
      <Text style={heading}>You're in!</Text>
      <Text style={paragraph}>
        Hey {name}, great news — your application has been approved
        and your account is now fully active.
      </Text>
      <Text style={paragraph}>
        Head to your dashboard to explore available MCP servers,
        generate API keys, and start building.
      </Text>
      <Section style={{ textAlign: 'center' as const, margin: '8px 0 0' }}>
        <Link href={`${BASE_URL}/dashboard`} style={ctaButton}>
          Go to Dashboard
        </Link>
      </Section>
    </BaseLayout>
  );
}

const badge: React.CSSProperties = {
  fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 600,
  color: PRODUCT_COLORS.emerald500,
  backgroundColor: '#ecfdf5',
  border: '1px solid #a7f3d0',
  borderRadius: '8px',
  padding: '3px 10px',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};
