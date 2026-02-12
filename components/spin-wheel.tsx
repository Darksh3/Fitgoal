import React, { useState, useRef, useEffect } from 'react';

/**
 * CONFIGURAÇÃO DOS SEGMENTOS DA ROLETA
 * Modifique aqui os descontos e cores
 */
const SEGMENTS = [
  { discount: 10, color: '#1c4d5d' },  // Azul escuro
  { discount: 20, color: '#2c7b61' },  // Verde
  { discount: 30, color: '#1c4d5d' },  // Azul escuro
  { discount: 40, color: '#40a37a' },  // Verde claro
  { discount: 50, color: '#1c4d5d' },  // Azul escuro
  { discount: 60, color: '#2c7b61' },  // Verde
  { discount: 80, color: '#1c4d5d' },  // Azul escuro
  { discount: 20, color: '#40a37a' },  // Verde claro
];

/**
 * Gera posições para as luzes ao redor da roleta
 */
const generateLightPositions = (count = 24) => {
  const lights = [];
  for (let i = 0; i < count; i++) {
    lights.push((i / count) * 360);
  }
  return lights;
};

const WHEEL_LIGHTS = generateLightPositions(24);

/**
 * Componente SpinWheel - Roleta de Descontos
 * 
 * @param {function} onSpinComplete - Callback chamado quando a roleta para. Recebe o desconto ganho.
 * @param {boolean} disabled - Se true, o botão de girar fica desabilitado
 * 
 * Exemplo de uso:
 * <SpinWheel 
 *   onSpinComplete={(desconto) => console.log(`Ganhou ${desconto}%`)}
 *   disabled={false}
 * />
 */
export const SpinWheel = ({ onSpinComplete, disabled = false }) => {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lightsAnimating, setLightsAnimating] = useState(false);
  
  // Configurações de tamanho (modifique wheelSize para alterar o tamanho)
  const wheelSize = 340;
  const center = wheelSize / 2;
  const outerRadius = 145;

  // Desenha a roleta no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const scale = window.devicePixelRatio || 1;
    
    // Configura o canvas para alta resolução
    canvas.width = wheelSize * scale;
    canvas.height = wheelSize * scale;
    ctx.scale(scale, scale);
    
    // Limpa o canvas
    ctx.clearRect(0, 0, wheelSize, wheelSize);
    
    // Aplica rotação
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);
    
    const segmentAngle = (2 * Math.PI) / SEGMENTS.length;
    
    // Desenha cada segmento
    SEGMENTS.forEach((segment, index) => {
      const startAngle = index * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      
      // Desenha o segmento
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, outerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = '#0d1f1e';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Desenha o texto do desconto
      ctx.save();
      const midAngle = startAngle + segmentAngle / 2;
      const textRadius = outerRadius * 0.65;
      const textX = center + textRadius * Math.cos(midAngle);
      const textY = center + textRadius * Math.sin(midAngle);
      
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      ctx.fillText(`${segment.discount}%`, 0, 0);
      ctx.restore();
    });
    
    // Desenha os círculos centrais
    const gradient = ctx.createLinearGradient(center - 40, center - 40, center + 40, center + 40);
    gradient.addColorStop(0, '#40a37a');
    gradient.addColorStop(1, '#1c4d5d');
    
    ctx.beginPath();
    ctx.arc(center, center, 40, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#0d1f1e';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(center, center, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#2c7b61';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(center, center, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#40a37a';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#77ff00';
    ctx.fill();
    
    ctx.restore();
    
  }, [rotation, wheelSize, center, outerRadius]);

  /**
   * Função que executa o giro da roleta
   */
  const spin = () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setLightsAnimating(true);

    // Calcula resultado aleatório
    const segmentIndex = Math.floor(Math.random() * SEGMENTS.length);
    const segmentAngle = 360 / SEGMENTS.length;
    
    // Calcula a rotação final
    const baseRotation = 360 * 5; // 5 voltas completas
    const segmentOffset = segmentIndex * segmentAngle;
    const randomOffset = Math.random() * (segmentAngle * 0.6) + (segmentAngle * 0.2);
    const finalRotation = baseRotation + (360 - segmentOffset) - randomOffset + (segmentAngle / 2);

    // Anima a rotação
    const startRotation = rotation;
    const targetRotation = startRotation + finalRotation;
    const duration = 5000; // 5 segundos
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Função de easing (desacelera no final)
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentRotation = startRotation + (targetRotation - startRotation) * easedProgress;
      setRotation(currentRotation);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setLightsAnimating(false);
        const wonDiscount = SEGMENTS[segmentIndex].discount;
        if (onSpinComplete) {
          onSpinComplete(wonDiscount);
        }
      }
    };
    
    requestAnimationFrame(animate);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
      {/* Container da Roleta */}
      <div style={{ position: 'relative', width: wheelSize, height: wheelSize }}>
        {/* Brilho externo */}
        <div 
          style={{
            position: 'absolute',
            inset: '-40px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 184, 0, 0.35) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        
        {/* Anel dourado externo */}
        <div 
          style={{
            position: 'absolute',
            inset: '-8px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700 0%, #c9a227 50%, #ffd700 100%)',
            zIndex: 1,
          }}
        />
        
        {/* Container interno da roleta */}
        <div 
          style={{
            position: 'absolute',
            inset: '0px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#0d1f1e',
            zIndex: 2,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: wheelSize,
              height: wheelSize,
            }}
          />
        </div>
        
        {/* Luzes ao redor */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
          {WHEEL_LIGHTS.map((angle, index) => {
            const radius = center + 12;
            const x = Math.cos((angle - 90) * Math.PI / 180) * radius + center;
            const y = Math.sin((angle - 90) * Math.PI / 180) * radius + center;
            return (
              <div
                key={index}
                className={`wheel-light ${lightsAnimating ? 'animate' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 0.05}s`,
                }}
              />
            );
          })}
        </div>

        {/* Ponteiro */}
        <div 
          style={{ 
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
          }}
        >
          <div 
            style={{ 
              width: 0,
              height: 0,
              borderLeft: '22px solid transparent',
              borderRight: '22px solid transparent',
              borderTop: '40px solid #ffb800',
              filter: 'drop-shadow(0 4px 12px rgba(255, 184, 0, 0.7))',
            }}
          />
        </div>
      </div>

      {/* Botão de Girar */}
      <button
        onClick={spin}
        disabled={isSpinning || disabled}
        style={{
          padding: '16px 48px',
          fontSize: '20px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderRadius: '9999px',
          border: '2px solid #40a37a',
          background: 'linear-gradient(180deg, #40a37a 0%, #2c7b61 50%, #1c4d5d 100%)',
          color: '#ffffff',
          cursor: isSpinning || disabled ? 'not-allowed' : 'pointer',
          opacity: isSpinning || disabled ? 0.5 : 1,
          boxShadow: '0 4px 20px rgba(64, 163, 122, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSpinning && !disabled) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(64, 163, 122, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(64, 163, 122, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
        }}
      >
        {isSpinning ? 'Girando...' : 'Girar Roleta'}
      </button>
    </div>
  );
};

export default SpinWheel;
