'use client';

import Link from 'next/link';
import { UserButton } from '@neondatabase/neon-js/auth/react/ui';
import { getTimeTheme, NOISE_STYLE, FORCE_THEME } from './components/theme';

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Keyframe animations injected once via <style> tag
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
@keyframes cloud-drift-4 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
  35%  { transform: translateX(35px) translateY(-6px) scale(1.03); opacity: 0.6; }
  65%  { transform: translateX(15px) translateY(8px) scale(1.06); opacity: 0.45; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.5; }
}
@keyframes cloud-drift-5 {
  0%   { transform: translateX(0) translateY(0) scale(1); opacity: 0.45; }
  50%  { transform: translateX(-30px) translateY(-10px) scale(1.05); opacity: 0.55; }
  100% { transform: translateX(0) translateY(0) scale(1); opacity: 0.45; }
}
`;

interface DashboardHomeProps {
  userName: string;
  isAdmin: boolean;
}

export function DashboardHome({ userName, isAdmin }: DashboardHomeProps) {
  const theme = getTimeTheme(FORCE_THEME);
  const firstName = userName.split(' ')[0] || '';
  const isNight = theme.id === 'night';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: theme.skyGradient }}
    >
      {/* Inject cloud animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: CLOUD_KEYFRAMES }} />

      {/* Animated CSS clouds */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        {/* Cloud 1 — large, top left, slow drift right */}
        <div
          className="absolute will-change-transform"
          style={{
            top: '2%', left: '-8%',
            width: '55%', height: '30%',
            animation: 'cloud-drift-1 80s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.55)', filter: 'blur(60px)' }} />
          <div className="absolute top-[20%] left-[15%] h-[80%] w-[70%] rounded-full" style={{ background: 'rgba(255,255,255,0.7)', filter: 'blur(40px)' }} />
          <div className="absolute top-[10%] left-[35%] h-[60%] w-[40%] rounded-full" style={{ background: 'rgba(255,255,255,0.8)', filter: 'blur(25px)' }} />
        </div>

        {/* Cloud 2 — medium, top right, drift left */}
        <div
          className="absolute will-change-transform"
          style={{
            top: '5%', right: '-5%',
            width: '48%', height: '25%',
            animation: 'cloud-drift-2 95s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.45)', filter: 'blur(55px)' }} />
          <div className="absolute top-[15%] left-[20%] h-[70%] w-[60%] rounded-full" style={{ background: 'rgba(255,255,255,0.65)', filter: 'blur(35px)' }} />
          <div className="absolute top-[25%] left-[30%] h-[50%] w-[35%] rounded-full" style={{ background: 'rgba(255,255,255,0.75)', filter: 'blur(20px)' }} />
        </div>

        {/* Cloud 3 — wispy, center, gentle float */}
        <div
          className="absolute will-change-transform"
          style={{
            top: '22%', left: '20%',
            width: '45%', height: '18%',
            animation: 'cloud-drift-3 110s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.4)', filter: 'blur(50px)' }} />
          <div className="absolute top-[20%] left-[20%] h-[60%] w-[55%] rounded-full" style={{ background: 'rgba(255,255,255,0.55)', filter: 'blur(30px)' }} />
        </div>

        {/* Cloud 4 — bottom left, slow drift */}
        <div
          className="absolute will-change-transform"
          style={{
            bottom: '8%', left: '-12%',
            width: '55%', height: '28%',
            animation: 'cloud-drift-4 90s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(60px)' }} />
          <div className="absolute top-[10%] left-[20%] h-[80%] w-[60%] rounded-full" style={{ background: 'rgba(255,255,255,0.65)', filter: 'blur(40px)' }} />
          <div className="absolute top-[25%] left-[35%] h-[50%] w-[35%] rounded-full" style={{ background: 'rgba(255,255,255,0.75)', filter: 'blur(25px)' }} />
        </div>

        {/* Cloud 5 — bottom right, gentle float */}
        <div
          className="absolute will-change-transform"
          style={{
            bottom: '3%', right: '-8%',
            width: '45%', height: '24%',
            animation: 'cloud-drift-5 100s ease-in-out infinite',
          }}
        >
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.4)', filter: 'blur(55px)' }} />
          <div className="absolute top-[15%] left-[15%] h-[70%] w-[65%] rounded-full" style={{ background: 'rgba(255,255,255,0.6)', filter: 'blur(35px)' }} />
        </div>
      </div>

      {/* Noise texture over the sky */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-30"
        style={NOISE_STYLE}
      />

      {/* Centered card — poke.com proportions: max-w-md, h-[750px] on desktop */}
      <main className="relative z-10 h-full w-full max-w-md text-center md:h-[750px]">
        <div className="flex h-full flex-col justify-between">
          <div
            className="relative flex h-full flex-col overflow-hidden py-4 shadow-2xl md:rounded-3xl"
          >
            {/* Full-card background image */}
            <div className="absolute inset-0 z-0">
              <img src={theme.heroImage} alt="" className="h-full w-full object-cover" />
              {/* Gradient overlay: transparent top → heroFade mid → cardBg bottom */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, transparent 20%, ${theme.heroFade}cc 55%, ${theme.cardBg} 80%)`,
                }}
              />
            </div>

            {/* Header — logo, date, avatar */}
            <header className="relative z-[5] flex h-12 shrink-0 items-center justify-between px-4">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="thedevhype" className="h-6 w-6" />
              </Link>
              <div />
              <UserButton
                size="icon"
                additionalLinks={isAdmin ? [{ href: '/dashboard/admin', label: 'Admin', signedIn: true }] : []}
              />
            </header>

            {/* Spacer — pushes content to bottom half */}
            <div className="flex-1" />

            {/* Greeting */}
            <div className="relative z-[1] px-5 pb-6 text-center">
              <h1 className={`text-2xl font-normal ${theme.homeTextPrimary}`}>
                {theme.greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
              <p className={`mt-1 text-base font-medium ${theme.homeTextPrimary} opacity-60`}>
                Rio de Janeiro, {getFormattedDate()}
              </p>
            </div>

            {/* Agent cards */}
            <div className="relative z-[1] shrink-0 px-4 pb-5 pt-2 sm:px-5">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/dashboard/eloa"
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border p-5 backdrop-blur-sm transition-colors ${
                    isNight
                      ? 'border-white/15 bg-white/10 hover:bg-white/15'
                      : 'border-slate-200/80 bg-white/60 hover:bg-white/80'
                  }`}
                >
                  <img src="/eloa.png" alt="Eloa" className="h-14 w-14 rounded-full" />
                  <div className="text-center">
                    <p className={`text-base font-semibold ${theme.homeTextPrimary}`}>Eloa</p>
                    <p className={`mt-0.5 text-sm ${theme.homeTextSecondary}`}>Content Curator</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/lucian"
                  className={`flex flex-col items-center gap-2.5 rounded-2xl border p-5 backdrop-blur-sm transition-colors ${
                    isNight
                      ? 'border-white/15 bg-white/10 hover:bg-white/15'
                      : 'border-slate-200/80 bg-white/60 hover:bg-white/80'
                  }`}
                >
                  <img src="/lucian.png" alt="Lucian" className="h-14 w-14 rounded-full" />
                  <div className="text-center">
                    <p className={`text-base font-semibold ${theme.homeTextPrimary}`}>Lucian</p>
                    <p className={`mt-0.5 text-sm ${theme.homeTextSecondary}`}>Grocery Manager</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/otto"
                  className={`col-span-2 flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm transition-colors ${
                    isNight
                      ? 'border-white/15 bg-white/10 hover:bg-white/15'
                      : 'border-slate-200/80 bg-white/60 hover:bg-white/80'
                  }`}
                >
                  <img src="/otto.png" alt="Otto" className="h-10 w-10 rounded-full" />
                  <div className="text-left">
                    <p className={`text-base font-semibold leading-tight ${theme.homeTextPrimary}`}>Otto</p>
                    <p className={`mt-0.5 text-sm leading-tight ${theme.homeTextSecondary}`}>Second Brain</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`ml-auto ${isNight ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </Link>

                <Link
                  href="/dashboard/familia"
                  className={`col-span-2 flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm transition-colors ${
                    isNight
                      ? 'border-white/15 bg-white/10 hover:bg-white/15'
                      : 'border-slate-200/80 bg-white/60 hover:bg-white/80'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${isNight ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-600'}`}>
                    F
                  </div>
                  <div className="text-left">
                    <p className={`text-base font-semibold leading-tight ${theme.homeTextPrimary}`}>Familia</p>
                    <p className={`mt-0.5 text-sm leading-tight ${theme.homeTextSecondary}`}>Shared Workspace</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`ml-auto ${isNight ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </Link>

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
