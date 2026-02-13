'use client';
import { ReactNode } from 'react';

interface ShimmerEffectProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function ShimmerEffect({
  children,
  className = '',
  style = {},
  disabled = false
}: ShimmerEffectProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Shimmer effect overlay */}
      {!disabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(-30deg, transparent 40%, rgba(255,255,255,0.02) 50%, transparent 60%)',
            animation: 'shimmer 8s ease-in-out infinite',
            zIndex: 1
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
