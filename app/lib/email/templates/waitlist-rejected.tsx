import { Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, mutedText, PRODUCT_COLORS } from './base-layout';

interface WaitlistRejectedProps {
  name: string;
}

export function WaitlistRejected({ name }: WaitlistRejectedProps) {
  return (
    <BaseLayout preview="Update on your TheDevHype application">
      <Text style={heading}>Application update</Text>
      <Text style={paragraph}>
        Hey {name}, thanks for your interest in TheDevHype.
      </Text>
      <Text style={paragraph}>
        Unfortunately, we're unable to approve your application at this time.
        This could be due to limited capacity or other factors.
      </Text>
      <Text style={mutedText}>
        If you believe this was a mistake, reach out to us at{' '}
        <Link href="mailto:support@thedevhype.com" style={supportLink}>
          support@thedevhype.com
        </Link>{' '}
        and we'll be happy to take another look.
      </Text>
    </BaseLayout>
  );
}

const supportLink: React.CSSProperties = {
  color: PRODUCT_COLORS.slate700,
  textDecoration: 'underline',
};
