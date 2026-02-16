'use client';

interface StarBorderProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  speed?: string;
}

export default function StarBorder({
  children,
  className = '',
  color = 'rgba(255,255,255,0.15)',
  speed = '6s',
}: StarBorderProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          padding: '1px',
          background: `linear-gradient(var(--star-angle, 0deg), transparent 40%, ${color} 50%, transparent 60%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          animation: `star-rotate ${speed} linear infinite`,
        }}
      />
      {children}
      <style>{`
        @property --star-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes star-rotate {
          to { --star-angle: 360deg; }
        }
      `}</style>
    </div>
  );
}
