'use client';
import { ReactNode } from 'react';
import ShimmerEffect from './ShimmerEffect';

interface MiamiGlassProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'background' | 'foreground';
  shimmer?: boolean;
}

export default function MiamiGlass({
  children,
  className = '',
  style = {},
  variant = 'background',
  shimmer = true,
  ...props
}: MiamiGlassProps) {
  const getGlassStyle = (): React.CSSProperties => {
    if (variant === 'foreground') {
      return {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(15px) saturate(130%)',
        WebkitBackdropFilter: 'blur(15px) saturate(130%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        ...style
      };
    } else {
      return {
        background: 'rgba(255, 255, 255, 0.01)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.03)',
        ...style
      };
    }
  };

  const glassStyle = getGlassStyle();

  if (shimmer) {
    return (
      <ShimmerEffect
        className={className}
        style={glassStyle}
        {...props}
      >
        {children}
      </ShimmerEffect>
    );
  }

  return (
    <div
      className={className}
      style={glassStyle}
      {...props}
    >
      {children}
    </div>
  );
}
