import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, heading, paragraph, ctaButton, mutedText, infoBox, PRODUCT_COLORS } from './base-layout';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

interface McpKeyGeneratedProps {
  name: string;
  mcpName: string;
}

export function McpKeyGenerated({ name, mcpName }: McpKeyGeneratedProps) {
  return (
    <BaseLayout preview={`API key generated for ${mcpName}`}>
      <Text style={heading}>API key generated</Text>
      <Text style={paragraph}>
        Hey {name}, a new API key has been generated for your MCP server.
      </Text>
      <Text style={infoBox}>
        <span style={{ fontSize: '12px', color: PRODUCT_COLORS.slate500 }}>Server</span>
        <br />
        <strong style={{ color: PRODUCT_COLORS.slate800 }}>{mcpName}</strong>
      </Text>
      <Text style={mutedText}>
        For security, the full key is only shown once in your dashboard.
        Make sure to copy and store it somewhere safe.
      </Text>
      <Section style={{ textAlign: 'center' as const }}>
        <Link href={`${BASE_URL}/dashboard`} style={ctaButton}>
          View Dashboard
        </Link>
      </Section>
    </BaseLayout>
  );
}
