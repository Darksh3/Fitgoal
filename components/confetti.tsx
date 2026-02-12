import React, { useEffect, useState } from 'react';

/**
 * Cores do confete - modifique para as cores da sua marca
 */
const CONFETTI_COLORS = ['#77ff00', '#ffb800', '#40a37a', '#2c7b61', '#ffd700'];

/**
 * Componente Confetti - Efeito de confete/celebração
 * 
 * @param {boolean} active - Se true, mostra o confete caindo
 * 
 * Exemplo de uso:
 * <Confetti active={showConfetti} />
 */
export const Confetti = ({ active }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const newParticles = [];
      for (let i = 0; i < 100; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 2,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 6 + Math.random() * 8,
          rotation: Math.random() * 360,
        });
      }
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: 50,
    }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="confetti"
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
