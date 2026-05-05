import React from 'react';

type IconName =
  | 'arrowBack'
  | 'chat'
  | 'checkAll'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'logout'
  | 'search'
  | 'send'
  | 'shield'
  | 'shieldLock'
  | 'sync';

interface IconProps {
  name: IconName;
  className?: string;
}

export default function Icon({ name, className = '' }: IconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      {name === 'arrowBack' && <path {...common} d="M19 12H5m6-7-7 7 7 7" />}
      {name === 'chat' && <path {...common} d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 1 1 18-5Z" />}
      {name === 'checkAll' && (
        <>
          <path {...common} d="m3 12 4 4 8-8" />
          <path {...common} d="m11 12 4 4 6-8" />
        </>
      )}
      {name === 'eye' && (
        <>
          <path {...common} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle {...common} cx="12" cy="12" r="2.5" />
        </>
      )}
      {name === 'eyeOff' && (
        <>
          <path {...common} d="M3 3 21 21" />
          <path {...common} d="M10.6 10.7A2.5 2.5 0 0 0 14 14" />
          <path {...common} d="M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a16.9 16.9 0 0 1-3.1 3.8" />
          <path {...common} d="M6.6 6.7C3.9 8.5 2 12 2 12a16.3 16.3 0 0 0 5.4 5.4A10.6 10.6 0 0 0 12 19c1 0 2-.1 2.9-.4" />
        </>
      )}
      {name === 'lock' && (
        <>
          <rect {...common} height="10" rx="2" width="16" x="4" y="10" />
          <path {...common} d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      )}
      {name === 'logout' && (
        <>
          <path {...common} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path {...common} d="m10 17 5-5-5-5" />
          <path {...common} d="M15 12H3" />
        </>
      )}
      {name === 'search' && (
        <>
          <circle {...common} cx="11" cy="11" r="7" />
          <path {...common} d="m20 20-3.5-3.5" />
        </>
      )}
      {name === 'send' && (
        <>
          <path {...common} d="m22 2-7 20-4-9-9-4Z" />
          <path {...common} d="M22 2 11 13" />
        </>
      )}
      {name === 'shield' && <path {...common} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />}
      {name === 'shieldLock' && (
        <>
          <path {...common} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <rect {...common} height="5" rx="1" width="7" x="8.5" y="11" />
          <path {...common} d="M10 11V9.5a2 2 0 0 1 4 0V11" />
        </>
      )}
      {name === 'sync' && (
        <>
          <path {...common} d="M21 12a9 9 0 0 0-15-6.7L3 8" />
          <path {...common} d="M3 3v5h5" />
          <path {...common} d="M3 12a9 9 0 0 0 15 6.7L21 16" />
          <path {...common} d="M16 16h5v5" />
        </>
      )}
    </svg>
  );
}
