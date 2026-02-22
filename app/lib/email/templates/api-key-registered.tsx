import { Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, mutedText, infoBox, PRODUCT_COLORS } from './base-layout';

interface ApiKeyRegisteredProps {
  name: string;
  email: string;
  keyPrefix: string;
  tier: string;
}

export function ApiKeyRegistered({ name, email, keyPrefix, tier }: ApiKeyRegisteredProps) {
  return (
    <BaseLayout preview="Your TheDevHype API key is ready">
      <Text style={heading}>API key registered</Text>
      <Text style={paragraph}>
        Hey {name}, your API key has been created and is ready to use.
      </Text>
      <Text style={infoBox}>
        <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Email</span>
        <br />
        <strong style={{ color: PRODUCT_COLORS.slate800 }}>{email}</strong>
        <br /><br />
        <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Key</span>
        <br />
        <code style={codeStyle}>{keyPrefix}...</code>
        <br /><br />
        <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Tier</span>
        <br />
        <strong style={{ color: PRODUCT_COLORS.slate800 }}>{tier}</strong>
      </Text>
      <Text style={mutedText}>
        Your full API key was shown when you registered. If you lost it,
        contact support@thedevhype.com for assistance.
      </Text>
    </BaseLayout>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: '"Geist Mono", "SF Mono", Monaco, "Cascadia Mono", monospace',
  fontSize: '13px',
  color: PRODUCT_COLORS.slate800,
  backgroundColor: PRODUCT_COLORS.zinc100,
  padding: '2px 6px',
  borderRadius: '4px',
};
