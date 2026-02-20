'use client';
import { CSSProperties, useMemo } from 'react';
import { secureRandom } from '@/lib/random';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  layer: string;
  color: string;
}

function generateParticles(density: number): Particle[] {
  return Array.from({ length: density }, (_, i) => ({
    id: i,
    x: secureRandom() * 100,
    y: secureRandom() * 100,
    size: secureRandom() * 2.5 + 1,
    opacity: secureRandom() * 0.4 + 0.2,
    duration: secureRandom() * 25 + 15,
    delay: secureRandom() * -20,
    layer: secureRandom() > 0.7 ? 'front' : 'back',
    color: secureRandom() > 0.6 ? '#008E97' : 'rgba(255, 255, 255, 0.6)',
  }));
}

function buildBackStyle(p: Particle): CSSProperties {
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: `${p.size}px`,
    height: `${p.size}px`,
    background: p.color,
    opacity: p.opacity * 0.7,
    animation: `floatUp ${p.duration}s linear infinite`,
    animationDelay: `${p.delay}s`,
    transform: 'translateZ(0)',
    filter: 'blur(0.5px)',
  };
}

function buildFrontStyle(p: Particle, speed: number): CSSProperties {
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: `${p.size * 1.1}px`,
    height: `${p.size * 1.1}px`,
    background: p.color,
    opacity: p.opacity * 0.8,
    animation: `floatUp ${p.duration * speed}s linear infinite`,
    animationDelay: `${p.delay}s`,
    transform: 'translateZ(0)',
    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
  };
}

const FLOAT_UP_KEYFRAMES = `
  @keyframes floatUp {
    0% {
      transform: translateY(100vh) translateX(0) scale(0);
      opacity: 0;
    }
    5% {
      opacity: 0.8;
      transform: translateY(95vh) translateX(2px) scale(0.5);
    }
    15% {
      opacity: 1;
      transform: translateY(85vh) translateX(8px) scale(1);
    }
    85% {
      opacity: 1;
      transform: translateY(15vh) translateX(-8px) scale(1);
    }
    95% {
      opacity: 0.8;
      transform: translateY(5vh) translateX(-2px) scale(0.5);
    }
    100% {
      transform: translateY(-5vh) translateX(0) scale(0);
      opacity: 0;
    }
  }
`;

interface FloatingParticlesProps {
  density?: number;
  speed?: number;
}

export default function FloatingParticles({
  density = 50,
  speed = 1,
}: FloatingParticlesProps) {
  // generateParticles is a stable module-level function, not a reactive dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const particles = useMemo(() => generateParticles(density), [density]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {/* Background particles */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {particles
          .filter((p) => p.layer === 'back')
          .map((p) => (
            <div key={`back-${p.id}`} className="absolute rounded-full" style={buildBackStyle(p)} />
          ))}
      </div>

      {/* Foreground particles */}
      <div className="absolute inset-0" style={{ zIndex: 8 }}>
        {particles
          .filter((p) => p.layer === 'front')
          .map((p) => (
            <div key={`front-${p.id}`} className="absolute rounded-full" style={buildFrontStyle(p, speed)} />
          ))}
      </div>

      <style>{FLOAT_UP_KEYFRAMES}</style>
    </div>
  );
}
