'use client';
import { useMemo } from 'react';

interface FloatingParticlesProps {
  density?: number;
  speed?: number;
}

export default function FloatingParticles({
  density = 50,
  speed = 1
}: FloatingParticlesProps) {
  // Generate particles with random positions - memoized to prevent re-generation on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const particles = useMemo(() => {
    // Using Math.random() here is intentional and safe within useMemo
    return Array.from({ length: density }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.4 + 0.2,
      duration: Math.random() * 25 + 15,
      delay: Math.random() * -20,
      layer: Math.random() > 0.7 ? 'front' : 'back',
      color: Math.random() > 0.6 ? '#008E97' : 'rgba(255, 255, 255, 0.6)'
    }));
  }, [density]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
      {/* Background particles */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {particles
          .filter(p => p.layer === 'back')
          .map((particle) => (
            <div
              key={`back-${particle.id}`}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: particle.color,
                opacity: particle.opacity * 0.7,
                animation: `floatUp ${particle.duration}s linear infinite`,
                animationDelay: `${particle.delay}s`,
                transform: 'translateZ(0)',
                filter: 'blur(0.5px)'
              }}
            />
          ))}
      </div>

      {/* Foreground particles */}
      <div className="absolute inset-0" style={{ zIndex: 8 }}>
        {particles
          .filter(p => p.layer === 'front')
          .map((particle) => (
            <div
              key={`front-${particle.id}`}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size * 1.1}px`,
                height: `${particle.size * 1.1}px`,
                background: particle.color,
                opacity: particle.opacity * 0.8,
                animation: `floatUp ${particle.duration * speed}s linear infinite`,
                animationDelay: `${particle.delay}s`,
                transform: 'translateZ(0)',
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
              }}
            />
          ))}
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}
