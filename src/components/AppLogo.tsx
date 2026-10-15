import React from 'react';
import { BRAND } from '../brand';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

const ICON_SIZES = { sm: 28, md: 38, lg: 52 } as const;

/** Marca genérica (tijolos empilhados). Substitua pelo logo da sua empresa. */
export const AppLogo: React.FC<AppLogoProps> = ({ className = '', size = 'md', variant = 'full' }) => {
  const dim = ICON_SIZES[size];

  const icon = (
    <svg width={dim} height={dim} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="appLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C278" />
          <stop offset="100%" stopColor="#B38938" />
        </linearGradient>
      </defs>
      <rect x="10" y="62" width="38" height="24" rx="4" fill="url(#appLogoGold)" />
      <rect x="52" y="62" width="38" height="24" rx="4" fill="url(#appLogoGold)" />
      <rect x="31" y="36" width="38" height="24" rx="4" fill="url(#appLogoGold)" fillOpacity="0.85" />
      <rect x="10" y="10" width="38" height="24" rx="4" fill="url(#appLogoGold)" fillOpacity="0.7" />
    </svg>
  );

  if (variant === 'icon') return <div className={`inline-flex items-center ${className}`}>{icon}</div>;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
      <div className="flex select-none flex-col leading-none">
        <span className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{BRAND.appName}</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-400 sm:text-[10px]">{BRAND.company}</span>
      </div>
    </div>
  );
};
