'use client';

import { AccountView } from '@neondatabase/neon-js/auth/react/ui';
import Link from 'next/link';
import { use } from 'react';
import { getTimeTheme, NOISE_STYLE, FORCE_THEME } from '../../(dashboard)/dashboard/components/theme';

const CLOUD_KEYFRAMES = `
@keyframes cloud-drift-1 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.6; }
  50%  { transform: translateX(50px) translateY(5px) scale(1.02); opacity: 0.55; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.6; }
}
@keyframes cloud-drift-2 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
  50%  { transform: translateX(-40px) translateY(10px) scale(1.04); opacity: 0.6; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
}
@keyframes cloud-drift-3 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.4; }
  50%  { transform: translateX(25px) translateY(12px) scale(1.06); opacity: 0.55; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.4; }
}
`;

export default function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = use(params);
  const theme = getTimeTheme(FORCE_THEME);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: theme.skyGradient }}
    >
      <style dangerouslySetInnerHTML={{ __html: CLOUD_KEYFRAMES }} />

      {/* Clouds */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div className="absolute will-change-transform" style={{ top: '2%', left: '-8%', width: '55%', height: '30%', animation: 'cloud-drift-1 80s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.55)', filter: 'blur(60px)' }} />
        </div>
        <div className="absolute will-change-transform" style={{ top: '5%', right: '-5%', width: '48%', height: '25%', animation: 'cloud-drift-2 95s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.45)', filter: 'blur(55px)' }} />
        </div>
        <div className="absolute will-change-transform" style={{ bottom: '8%', left: '-12%', width: '55%', height: '28%', animation: 'cloud-drift-3 110s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(60px)' }} />
        </div>
      </div>

      {/* Noise */}
      <div className="pointer-events-none absolute inset-0 z-[5] opacity-30" style={NOISE_STYLE} />

      {/* Wider card for account settings */}
      <main className="relative z-10 w-full max-w-2xl px-4 py-8 md:py-12">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-100 px-5 py-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-800"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
              <span className="text-sm font-medium">Back to home</span>
            </Link>
          </div>

          {/* Account view */}
          <div className="p-5">
            <AccountView path={path} />
          </div>
        </div>
      </main>
    </div>
  );
}
