import React from 'react';

interface AicteLogoProps {
  className?: string;
  size?: number;
}

export const AicteLogo: React.FC<AicteLogoProps> = ({ className = '', size = 44 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="AICTE Official Emblem"
    >
      {/* Outer Gear Ring (AICTE Technical Education Emblem) */}
      <circle cx="50" cy="50" r="48" fill="#0B2545" stroke="#F59E0B" strokeWidth="2.5" />
      
      {/* Outer Decorative Tooth Ring */}
      <circle cx="50" cy="50" r="43" stroke="#D97706" strokeWidth="1" strokeDasharray="3 3" />
      
      {/* Inner Blue Shield */}
      <circle cx="50" cy="50" r="40" fill="#0F2E5A" stroke="#FCD34D" strokeWidth="1.5" />

      {/* 24 Cog Teeth Wheel representing Technical Machinery */}
      <g stroke="#F59E0B" strokeWidth="1.2" opacity="0.9">
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="12"
            x2="50"
            y2="17"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
      </g>

      {/* Central Radiance Circle */}
      <circle cx="50" cy="50" r="26" fill="#1E3A8A" stroke="#F59E0B" strokeWidth="1.5" />

      {/* Traditional Lamp of Knowledge (Deepak) in Saffron & Gold */}
      {/* Lamp Base / Stand */}
      <path
        d="M44 68 H56 L54 62 H46 Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="0.8"
      />
      <path
        d="M48 62 H52 V56 H48 Z"
        fill="#FBBF24"
      />

      {/* Lamp Bowl */}
      <path
        d="M32 54 C32 60 40 62 50 62 C60 62 68 60 68 54 C68 52 64 50 50 50 C36 50 32 52 32 54 Z"
        fill="url(#goldGradient)"
        stroke="#D97706"
        strokeWidth="1"
      />

      {/* Lamp Spout / Extended Wick Flame */}
      <path
        d="M50 32 C50 32 56 42 56 48 C56 51 53.3 53 50 53 C46.7 53 44 51 44 48 C44 42 50 32 50 32 Z"
        fill="url(#flameGradient)"
      />

      {/* Inner Flame Glow */}
      <path
        d="M50 38 C50 38 53.5 44 53.5 48 C53.5 50 52 51.5 50 51.5 C48 51.5 46.5 50 46.5 48 C46.5 44 50 38 50 38 Z"
        fill="#FEF3C7"
      />

      {/* Radiating Light Rays */}
      <line x1="50" y1="23" x2="50" y2="28" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="39" y1="26" x2="42" y2="30" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="61" y1="26" x2="58" y2="30" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="35" x2="36" y2="38" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="68" y1="35" x2="64" y2="38" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />

      {/* Bottom Laurel / Text Indicator */}
      <path
        d="M30 73 Q50 82 70 73"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="50" cy="77" r="1.5" fill="#F59E0B" />

      {/* Gradients */}
      <defs>
        <linearGradient id="goldGradient" x1="32" y1="50" x2="68" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="flameGradient" x1="50" y1="32" x2="50" y2="53" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="0.6" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
    </svg>
  );
};
