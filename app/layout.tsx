import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
import { authClient } from '@/app/lib/auth/client';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TheDevHype - MCP Hub',
  description: 'Manage and connect your MCP servers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NeonAuthUIProvider
          authClient={authClient}
          credentials={false}
          social={{ providers: ['github'] }}
        >
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}
