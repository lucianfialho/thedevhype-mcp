'use client';

import { type ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { getTimeTheme, NOISE_STYLE, FORCE_THEME } from './theme';

// Cloud animation keyframes + scrollbar-hide utility
const CLOUD_KEYFRAMES = `
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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

/* ─── AppShell — poke.com style: sky background + white card ─── */

interface AppShellProps {
  children: ReactNode;
  title?: string;
  nav?: ReactNode;
}

export function AppShell({ children, title, nav }: AppShellProps) {
  const theme = getTimeTheme(FORCE_THEME);

  return (
    <div
      className="relative flex min-h-screen md:items-center md:justify-center overflow-hidden"
      style={{ background: theme.skyGradient }}
    >
      <style dangerouslySetInnerHTML={{ __html: CLOUD_KEYFRAMES }} />

      {/* Animated clouds */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div className="absolute will-change-transform" style={{ top: '2%', left: '-8%', width: '55%', height: '30%', animation: 'cloud-drift-1 80s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.55)', filter: 'blur(60px)' }} />
          <div className="absolute top-[20%] left-[15%] h-[80%] w-[70%] rounded-full" style={{ background: 'rgba(255,255,255,0.7)', filter: 'blur(40px)' }} />
        </div>
        <div className="absolute will-change-transform" style={{ top: '5%', right: '-5%', width: '48%', height: '25%', animation: 'cloud-drift-2 95s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.45)', filter: 'blur(55px)' }} />
          <div className="absolute top-[15%] left-[20%] h-[70%] w-[60%] rounded-full" style={{ background: 'rgba(255,255,255,0.65)', filter: 'blur(35px)' }} />
        </div>
        <div className="absolute will-change-transform" style={{ bottom: '8%', left: '-12%', width: '55%', height: '28%', animation: 'cloud-drift-3 110s ease-in-out infinite' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(60px)' }} />
        </div>
      </div>

      {/* Noise */}
      <div className="pointer-events-none absolute inset-0 z-[5] opacity-30" style={NOISE_STYLE} />

      {/* Centered white card */}
      <main className="relative z-10 min-h-[100dvh] w-full max-w-md text-center md:min-h-0 md:h-[750px]">
        <div className="flex h-full flex-col">
          <div className="relative flex h-full flex-col overflow-hidden bg-white py-4 shadow-2xl md:rounded-3xl">
            {/* Header: back button + title */}
            <header className="relative z-[1] flex h-12 shrink-0 items-center px-4 sm:px-5">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-800"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3L5 8l5 5" />
                </svg>
                <span className="text-sm font-medium">Back to home</span>
              </Link>
            </header>

            {/* Content — flex column; tabs handle their own scroll */}
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-4 pb-4 text-left sm:px-5">
              {children}
            </div>

            {nav && (
              <nav className="relative z-[1] shrink-0 border-t border-slate-200 px-4 py-2 sm:px-5">
                {nav}
              </nav>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── PillTabs ─── */

interface PillTab {
  id: string;
  label: string;
}

interface PillTabsProps {
  tabs: readonly PillTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  badge?: { tabId: string; count: number };
}

export function PillTabs({ tabs, activeTab, onTabChange, badge }: PillTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          {tab.label}
          {badge && badge.tabId === tab.id && badge.count > 0 && (
            <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {badge.count > 99 ? '99+' : badge.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── TabSelect ─── */

interface TabSelectOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabSelectProps {
  options: readonly TabSelectOption[];
  value: string;
  onChange: (id: string) => void;
  badge?: { id: string; count: number };
  fullWidth?: boolean;
}

export function TabSelect({ options, value, onChange, badge, fullWidth }: TabSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeOption = options.find((o) => o.id === value);
  const activeLabel = activeOption?.label ?? value;
  const activeIcon = activeOption?.icon;
  const badgeCount = badge && badge.id === value && badge.count > 0 ? badge.count : 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 ${fullWidth ? 'w-full justify-between' : ''}`}
      >
        {activeIcon}{activeLabel}
        {badgeCount > 0 && (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${fullWidth ? 'left-0 right-0' : 'right-0 min-w-[10rem]'}`}>
          {options.map((opt) => {
            const isActive = opt.id === value;
            const optBadge = badge && badge.id === opt.id && badge.count > 0 ? badge.count : 0;
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 font-medium text-slate-800'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {opt.icon}{opt.label}
                {optBadge > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {optBadge > 99 ? '99+' : optBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── StatCard + StatGrid ─── */

interface StatCardProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function StatCard({ label, value, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 ${className}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      {children}
    </div>
  );
}

/* ─── FilterPills ─── */

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPillsProps {
  options: readonly FilterOption[];
  active: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, active, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === opt.value
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── SectionHeader ─── */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── MiniSelect ─── */

interface MiniSelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface MiniSelectProps<T extends string | number> {
  value: T;
  options: MiniSelectOption<T>[];
  onChange: (v: T) => void;
  maxW?: string;
}

export function MiniSelect<T extends string | number>({ value, options, onChange, maxW }: MiniSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = options.find((o) => o.value === value)?.label ?? String(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 ${maxW ?? ''}`}
      >
        <span className="truncate">{activeLabel}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                opt.value === value
                  ? 'bg-slate-100 font-medium text-slate-800'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ListCard ─── */

interface ListCardProps {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListCard({ left, title, subtitle, meta, right, onClick, className = '' }: ListCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-left transition-colors hover:border-slate-300 ${className}`}
    >
      {left && <div className="shrink-0">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium text-slate-800">{title}</div>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
        {meta && <div className="mt-1 text-sm text-slate-400">{meta}</div>}
      </div>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </Wrapper>
  );
}
