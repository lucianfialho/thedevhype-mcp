import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, infoBox, PRODUCT_COLORS } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface SubscriptionUpdatedProps {
  name: string;
  planName: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
}

export function SubscriptionUpdated({ name, planName, status, cancelAtPeriodEnd, currentPeriodEnd }: SubscriptionUpdatedProps) {
  const formattedDate = new Date(currentPeriodEnd).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <BaseLayout preview={`Your ${planName} subscription was updated`}>
      <Text style={heading}>Subscription updated</Text>
      <Text style={paragraph}>
        Hey {name}, your <strong>{planName}</strong> subscription has been updated.
      </Text>
      {cancelAtPeriodEnd ? (
        <Text style={infoBox}>
          <span style={{ color: PRODUCT_COLORS.red500, fontWeight: 600, fontSize: '12px' }}>
            Canceling at period end
          </span>
          <br />
          You'll keep access until <strong style={{ color: PRODUCT_COLORS.slate800 }}>{formattedDate}</strong>.
        </Text>
      ) : (
        <Text style={infoBox}>
          <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Status</span>
          <br />
          <strong style={{ color: PRODUCT_COLORS.slate800 }}>{status}</strong>
          <br /><br />
          <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Current period ends</span>
          <br />
          <strong style={{ color: PRODUCT_COLORS.slate800 }}>{formattedDate}</strong>
        </Text>
      )}
      <Section style={{ textAlign: 'center' as const }}>
        <Link href={`${BASE_URL}/dashboard/billing`} style={ctaButton}>
          Manage Subscription
        </Link>
      </Section>
    </BaseLayout>
  );
}
