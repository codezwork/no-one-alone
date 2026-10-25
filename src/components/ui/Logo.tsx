'use client';
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  withBackground?: boolean;
}

export function Logo({ size = 32, className = '', withBackground = true }: LogoProps) {
  if (!withBackground) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 44 L21 34 C23 31.8 26.2 31 29 32.2 L31 33" />
          <path d="M16 48 L25 38.5" />
          <path d="M52 44 L43 34 C41 31.8 37.8 31 35 32.2 L33 33" />
          <path d="M48 48 L39 38.5" />
          <path d="M26 27 C28 24 31 23 34 24.5 L36.5 26 C38 27 38.5 29 37.5 30.5 L34 35.5" />
          <path d="M38 27 C36 24 33 23 30 24.5 L27.5 26 C26 27 25.5 29 26.5 30.5 L30 35.5" />
          <path d="M28 32 C30.5 30.2 33.5 30.2 36 32" strokeWidth="3.2" />
          <path d="M29 36 C31 37.5 33 37.5 35 36" strokeWidth="2.6" />
          <circle cx="32" cy="18" r="2.2" fill="currentColor" stroke="none" />
        </g>
      </svg>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-black dark:bg-white text-white dark:text-black shadow-md border border-black/10 dark:border-white/20 transition-all ${className}`}
    >
      <svg
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 44 L21 34 C23 31.8 26.2 31 29 32.2 L31 33" />
          <path d="M16 48 L25 38.5" />
          <path d="M52 44 L43 34 C41 31.8 37.8 31 35 32.2 L33 33" />
          <path d="M48 48 L39 38.5" />
          <path d="M26 27 C28 24 31 23 34 24.5 L36.5 26 C38 27 38.5 29 37.5 30.5 L34 35.5" />
          <path d="M38 27 C36 24 33 23 30 24.5 L27.5 26 C26 27 25.5 29 26.5 30.5 L30 35.5" />
          <path d="M28 32 C30.5 30.2 33.5 30.2 36 32" strokeWidth="3.5" />
          <path d="M29 36 C31 37.5 33 37.5 35 36" strokeWidth="2.8" />
          <circle cx="32" cy="18" r="2.4" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
