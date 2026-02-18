// Time-of-day theme system — colors and hero image change based on current hour
// Inspired by poke.com: light card on sky-gradient viewport background

export interface TimeTheme {
  id: 'morning' | 'afternoon' | 'evening' | 'night';
  // Home screen (poke-style light card)
  cardBg: string;         // card bottom background (white-ish)
  heroFade: string;       // hero fade-out color — matches sky gradient tones
  skyGradient: string;    // CSS gradient for viewport sky background
  heroImage: string;      // hero image URL for dashboard home (fallback poster)
  heroVideo: string;      // hero video URL for dashboard home
  greeting: string;       // greeting text
  homeTextPrimary: string;   // primary text color on light card
  homeTextSecondary: string; // secondary text color on light card
  // Inner pages (dark shell — AppShell)
  bg: string;             // panel background color (dark)
  viewportBg: string;     // outer viewport background (darker)
  textPrimary: string;    // primary text color class
  textSecondary: string;  // secondary text color class
  border: string;         // card border class
  cardHover: string;      // card hover class
  inputBg: string;        // input background class
}

const THEMES: Record<TimeTheme['id'], TimeTheme> = {
  morning: {
    id: 'morning',
    // Home — warm peach/salmon sky matching rio-morning.png sunrise tones
    cardBg: '#f8fafc',
    heroFade: '#f0d4c4',    // warm peach — matches sunrise sky in image
    skyGradient: 'linear-gradient(180deg, #d4a8a0 0%, #e0beb5 15%, #eacfc5 30%, #f0d4c4 50%, #e8ccc0 65%, #dfc0b8 80%, #d4b0aa 100%)',
    heroImage: '/rio-morning.png',
    heroVideo: '/rio-hero-morning.mp4',
    greeting: 'Good morning',
    homeTextPrimary: 'text-slate-700',
    homeTextSecondary: 'text-slate-400',
    // Inner pages
    bg: 'rgb(48, 32, 38)',
    viewportBg: 'rgb(35, 24, 28)',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-500',
    border: 'border-zinc-700/50',
    cardHover: 'hover:bg-white/5',
    inputBg: 'bg-zinc-800',
  },
  afternoon: {
    id: 'afternoon',
    // Home — bright blue sky, turquoise water, sandy beach bottom
    cardBg: '#f5f0e8',
    heroFade: '#d4c8b0',    // warm sand tone — matches beach/sidewalk at bottom of image
    skyGradient: 'linear-gradient(180deg, #6ba8c7 0%, #8dbdd5 15%, #a8cce0 30%, #c2dbe8 50%, #d4cfc0 65%, #c8b8a0 80%, #b8a890 100%)',
    heroImage: '/rio-afternoon.png',
    heroVideo: '',
    greeting: 'Good afternoon',
    homeTextPrimary: 'text-slate-700',
    homeTextSecondary: 'text-slate-500',
    // Inner pages
    bg: 'rgb(58, 42, 28)',
    viewportBg: 'rgb(40, 30, 20)',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-400',
    border: 'border-amber-800/30',
    cardHover: 'hover:bg-white/5',
    inputBg: 'bg-zinc-800',
  },
  evening: {
    id: 'evening',
    // Home — reuse morning image as sunset (same warm tones work)
    cardBg: '#f8fafc',
    heroFade: '#f0d4c4',
    skyGradient: 'linear-gradient(180deg, #d4a8a0 0%, #e0beb5 15%, #eacfc5 30%, #f0d4c4 50%, #e8ccc0 65%, #dfc0b8 80%, #d4b0aa 100%)',
    heroImage: '/rio-morning.png',
    heroVideo: '',
    greeting: 'Good evening',
    homeTextPrimary: 'text-slate-700',
    homeTextSecondary: 'text-slate-400',
    // Inner pages
    bg: 'rgb(42, 35, 48)',
    viewportBg: 'rgb(30, 25, 35)',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-500',
    border: 'border-zinc-700/50',
    cardHover: 'hover:bg-white/5',
    inputBg: 'bg-zinc-800',
  },
  night: {
    id: 'night',
    // Home — deep navy with moonlight glow, city lights reflecting on water
    cardBg: '#141c2b',
    heroFade: '#151e30',    // dark navy-blue — matches the sky/water tones
    skyGradient: 'linear-gradient(180deg, #0a1020 0%, #0f1828 15%, #142030 30%, #182840 50%, #152238 65%, #101a2a 80%, #0a1018 100%)',
    heroImage: '/rio-night.png',
    heroVideo: '',
    greeting: 'Good night',
    homeTextPrimary: 'text-zinc-100',
    homeTextSecondary: 'text-zinc-500',
    // Inner pages
    bg: 'rgb(17, 23, 32)',
    viewportBg: 'rgb(10, 14, 20)',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-500',
    border: 'border-zinc-700/50',
    cardHover: 'hover:bg-white/5',
    inputBg: 'bg-zinc-800',
  },
};

export function getTimeTheme(override?: TimeTheme['id']): TimeTheme {
  if (override) return THEMES[override];
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return THEMES.morning;
  if (hour >= 12 && hour < 17) return THEMES.afternoon;
  if (hour >= 17 && hour < 20) return THEMES.evening;
  return THEMES.night;
}

// Set to a theme id ('morning' | 'afternoon' | 'evening' | 'night') to override, or undefined for auto
export const FORCE_THEME: TimeTheme['id'] | undefined = undefined;

export const NOISE_STYLE = {
  backgroundImage: 'url(https://poke.com/app-assets/noise.png)',
  backgroundRepeat: 'repeat' as const,
  backgroundSize: '100px',
  backgroundBlendMode: 'overlay' as const,
  maskImage: 'linear-gradient(transparent 0%, black 30px)',
};
