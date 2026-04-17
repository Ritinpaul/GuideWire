import React from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   GIGASHIELD LOGO — Modern geometric G + Shield monogram
   ═══════════════════════════════════════════════════════════════════════════ */
export default function GigShieldLogo({ size = 32, className = '', dark = false }) {
  const id = `gs-logo-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CDFA50" />
          <stop offset="50%" stopColor="#B8FF00" />
          <stop offset="100%" stopColor="#7CB342" />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="20" y1="18" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={dark ? '#0a0a0a' : '#1a1a1a'} />
          <stop offset="100%" stopColor={dark ? '#1a1a1a' : '#333'} />
        </linearGradient>
      </defs>
      {/* Shield outer shape */}
      <path d="M32 2 L58 14 L58 36 C58 50 46 58 32 62 C18 58 6 50 6 36 L6 14 Z"
        fill={`url(#${id}-grad)`} />
      {/* Inner shield cutout */}
      <path d="M32 8 L52 18 L52 35 C52 46 42 53 32 56 C22 53 12 46 12 35 L12 18 Z"
        fill={`url(#${id}-inner)`} />
      {/* Geometric G letter */}
      <path d="M38 24 L38 20 L24 20 C20.7 20 18 22.7 18 26 L18 38 C18 41.3 20.7 44 24 44 L40 44 C43.3 44 46 41.3 46 38 L46 32 L34 32 L34 36 L42 36 L42 38 C42 39.1 41.1 40 40 40 L24 40 C22.9 40 22 39.1 22 38 L22 26 C22 24.9 22.9 24 24 24 L38 24Z"
        fill={`url(#${id}-grad)`} />
      {/* Accent notch */}
      <rect x="44" y="14" width="8" height="3" rx="1.5" fill="#B8FF00" opacity="0.7" />
    </svg>
  );
}
