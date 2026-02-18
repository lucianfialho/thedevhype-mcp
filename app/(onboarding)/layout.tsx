'use client';

import { getTimeTheme, NOISE_STYLE, FORCE_THEME } from '@/app/(dashboard)/dashboard/components/theme';

const CLOUD_KEYFRAMES = `
@keyframes cloud-drift-1 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.6; }
  25%  { transform: translateX(30px) translateY(-8px) scale(1.05); opacity: 0.7; }
  50%  { transform: translateX(50px) translateY(5px) scale(1.02); opacity: 0.55; }
  75%  { transform: translateX(20px) translateY(-3px) scale(1.07); opacity: 0.65; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.6; }
}
@keyframes cloud-drift-2 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
  30%  { transform: translateX(-40px) translateY(10px) scale(1.04); opacity: 0.6; }
  60%  { transform: translateX(-20px) translateY(-5px) scale(1.08); opacity: 0.45; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
}
@keyframes cloud-drift-3 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.4; }
  40%  { transform: translateX(25px) translateY(12px) scale(1.06); opacity: 0.55; }
  70%  { transform: translateX(-15px) translateY(5px) scale(1.03); opacity: 0.35; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.4; }
}
`;

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = getTimeTheme(FORCE_THEME);
  const isNight = theme.id === 'night';

  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-4 py-8 sm:py-12"
      style={{ background: theme.skyGradient }}
    >
      <style dangerouslySetInnerHTML={{ __html: CLOUD_KEYFRAMES }} />

      {/* Animated clouds */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div
          className="absolute will-change-transform"
          style={{ top: '2%', left: '-8%', width: '55%', height: '30%', animation: 'cloud-drift-1 80s ease-in-out infinite' }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.55)', filter: 'blur(60px)' }} />
          <div className="absolute top-[20%] left-[15%] h-[80%] w-[70%] rounded-full" style={{ background: 'rgba(255,255,255,0.7)', filter: 'blur(40px)' }} />
        </div>
        <div
          className="absolute will-change-transform"
          style={{ top: '5%', right: '-5%', width: '48%', height: '25%', animation: 'cloud-drift-2 95s ease-in-out infinite' }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.45)', filter: 'blur(55px)' }} />
          <div className="absolute top-[15%] left-[20%] h-[70%] w-[60%] rounded-full" style={{ background: 'rgba(255,255,255,0.65)', filter: 'blur(35px)' }} />
        </div>
        <div
          className="absolute will-change-transform"
          style={{ bottom: '8%', left: '-12%', width: '55%', height: '28%', animation: 'cloud-drift-3 110s ease-in-out infinite' }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(60px)' }} />
        </div>
      </div>

      {/* Noise texture */}
      <div className="pointer-events-none absolute inset-0 z-[5] opacity-30" style={NOISE_STYLE} />

      {/* Centered card */}
      <main
        className={`relative z-10 w-full max-w-xl rounded-3xl p-6 shadow-2xl sm:p-10 ${
          isNight ? 'dark border border-white/10' : 'border border-slate-200/50'
        }`}
        style={{ backgroundColor: theme.cardBg }}
      >
        {children}
      </main>
    </div>
  );
}
