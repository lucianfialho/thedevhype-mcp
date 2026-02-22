import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';

export const PRODUCT_COLORS = {
  brand: '#09090b',   // zinc-950
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc700: '#3f3f46',
  zinc500: '#71717a',
  zinc400: '#a1a1aa',
  zinc300: '#d4d4d8',
  zinc200: '#e4e4e7',
  zinc100: '#f4f4f5',
  zinc50: '#fafafa',
  white: '#ffffff',
  indigo600: '#4f46e5',
  indigo500: '#6366f1',
  emerald500: '#10b981',
  red500: '#ef4444',
  // Sky palette (morning theme)
  skyTop: '#d4a8a0',
  skyBottom: '#eacfc5',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate700: '#334155',
  slate800: '#1e293b',
} as const;

const FONT_FAMILY = '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const heading: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '20px',
  fontWeight: 600,
  color: PRODUCT_COLORS.slate800,
  lineHeight: '28px',
  margin: '0 0 8px',
  letterSpacing: '-0.02em',
};

export const paragraph: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '14px',
  lineHeight: '22px',
  color: PRODUCT_COLORS.slate700,
  margin: '0 0 16px',
};

export const ctaButton: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: FONT_FAMILY,
  backgroundColor: PRODUCT_COLORS.slate800,
  color: PRODUCT_COLORS.white,
  fontSize: '13px',
  fontWeight: 500,
  textDecoration: 'none',
  padding: '10px 20px',
  borderRadius: '12px',
  lineHeight: '20px',
};

export const mutedText: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '13px',
  lineHeight: '20px',
  color: PRODUCT_COLORS.slate500,
  margin: '0 0 16px',
};

export const infoBox: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '13px',
  lineHeight: '22px',
  color: PRODUCT_COLORS.slate700,
  backgroundColor: PRODUCT_COLORS.zinc50,
  border: `1px solid ${PRODUCT_COLORS.slate200}`,
  padding: '16px',
  borderRadius: '16px',
  margin: '0 0 20px',
};

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        {/* Sky gradient background container */}
        <Container style={skyContainer}>

          {/* White card — poke.com style */}
          <Section style={card}>
            {/* Card header — logo + app name */}
            <Section style={cardHeader}>
              <table cellPadding="0" cellSpacing="0" role="presentation">
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: '10px' }}>
                    <Img
                      src={`${BASE_URL}/logo.png`}
                      width="40"
                      height="40"
                      alt="TheDevHype"
                      style={logoImg}
                    />
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <Text style={logoText}>thedevhype</Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Content */}
            <Section style={cardContent}>
              {children}
            </Section>
          </Section>

          {/* Footer — outside card, on the sky */}
          <Section style={footer}>
            <Text style={footerLinks}>
              <Link href={`${BASE_URL}/privacy`} style={footerLink}>Privacy</Link>
              {'  ·  '}
              <Link href={`${BASE_URL}/terms`} style={footerLink}>Terms</Link>
              {'  ·  '}
              <Link href="mailto:support@thedevhype.com" style={footerLink}>Contact</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: PRODUCT_COLORS.skyBottom,
  background: `linear-gradient(180deg, ${PRODUCT_COLORS.skyTop} 0%, ${PRODUCT_COLORS.skyBottom} 100%)`,
  fontFamily: FONT_FAMILY,
  margin: 0,
  padding: '48px 16px',
  WebkitFontSmoothing: 'antialiased',
  minHeight: '100vh',
};

const skyContainer: React.CSSProperties = {
  maxWidth: '448px',
  margin: '0 auto',
};

const card: React.CSSProperties = {
  backgroundColor: PRODUCT_COLORS.white,
  borderRadius: '24px',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)',
};

const cardHeader: React.CSSProperties = {
  padding: '20px 24px 0',
};

const logoImg: React.CSSProperties = {
  borderRadius: '8px',
};

const logoText: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '15px',
  fontWeight: 600,
  color: PRODUCT_COLORS.slate800,
  margin: 0,
  letterSpacing: '-0.01em',
};

const cardContent: React.CSSProperties = {
  padding: '20px 24px 28px',
  textAlign: 'left' as const,
};

const footer: React.CSSProperties = {
  padding: '20px 0 0',
  textAlign: 'center' as const,
};

const footerLinks: React.CSSProperties = {
  fontFamily: FONT_FAMILY,
  fontSize: '11px',
  color: PRODUCT_COLORS.slate500,
  margin: 0,
};

const footerLink: React.CSSProperties = {
  color: PRODUCT_COLORS.slate500,
  textDecoration: 'none',
};
