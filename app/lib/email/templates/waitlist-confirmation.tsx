import { Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, mutedText, PRODUCT_COLORS } from './base-layout';

interface WaitlistConfirmationProps {
  name: string;
  position: number;
}

export function WaitlistConfirmation({ name, position }: WaitlistConfirmationProps) {
  return (
    <BaseLayout preview={`You're #${position} on the waitlist`}>
      <Text style={heading}>You're on the list!</Text>
      <Text style={paragraph}>
        Hey {name}, thanks for signing up for TheDevHype.
      </Text>
      <Text style={positionBadge}>
        #{position} in line
      </Text>
      <Text style={paragraph}>
        We're reviewing applications and will let you know as soon as
        your spot opens up.
      </Text>
      <Text style={mutedText}>
        Keep an eye on your inbox — we'll send you an email when your
        account is ready.
      </Text>
    </BaseLayout>
  );
}

const positionBadge: React.CSSProperties = {
  fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '24px',
  fontWeight: 700,
  color: PRODUCT_COLORS.slate800,
  textAlign: 'center' as const,
  backgroundColor: PRODUCT_COLORS.zinc50,
  border: `1px solid ${PRODUCT_COLORS.slate200}`,
  borderRadius: '16px',
  padding: '20px',
  margin: '4px 0 20px',
  letterSpacing: '-0.02em',
};
