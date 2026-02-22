import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, mutedText } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface SubscriptionCanceledProps {
  name: string;
  planName: string;
}

export function SubscriptionCanceled({ name, planName }: SubscriptionCanceledProps) {
  return (
    <BaseLayout preview={`Your ${planName} subscription has been canceled`}>
      <Text style={heading}>Subscription canceled</Text>
      <Text style={paragraph}>
        Hey {name}, your <strong>{planName}</strong> subscription has been canceled.
        You no longer have access to the associated MCP servers.
      </Text>
      <Text style={mutedText}>
        If this was a mistake or you'd like to resubscribe, you can view our
        available plans anytime.
      </Text>
      <Section style={{ textAlign: 'center' as const }}>
        <Link href={`${BASE_URL}/pricing`} style={ctaButton}>
          View Plans
        </Link>
      </Section>
    </BaseLayout>
  );
}
