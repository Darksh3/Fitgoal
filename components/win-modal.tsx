import React from 'react';
import { Gift, CheckCircle, ArrowRight, X } from 'lucide-react';

/**
 * Componente WinModal - Modal exibido após ganhar o desconto
 * 
 * @param {boolean} isOpen - Se true, mostra o modal
 * @param {number} discount - Porcentagem do desconto ganho
 * @param {function} onContinue - Callback chamado ao clicar em "Continuar"
 * @param {function} onClose - Callback para fechar o modal (opcional)
 * 
 * Exemplo de uso:
 * <WinModal 
 *   isOpen={showModal}
 *   discount={20}
 *   onContinue={() => window.location.href = '/checkout'}
 * />
 */
export const WinModal = ({ isOpen, discount, onContinue, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#0d1f1e',
        border: '1px solid rgba(119, 255, 0, 0.3)',
        borderRadius: '16px',
        maxWidth: '420px',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Botão fechar (opcional) */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        )}

        {/* Header com gradiente */}
        <div style={{
          padding: '32px 24px',
          background: 'linear-gradient(180deg, rgba(64, 163, 122, 0.3) 0%, transparent 100%)',
          textAlign: 'center',
        }}>
          {/* Ícone */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(119, 255, 0, 0.2)',
            marginBottom: '16px',
          }}>
            <Gift size={40} color="#77ff00" />
          </div>
          
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '48px',
            letterSpacing: '0.05em',
            color: '#77ff00',
            margin: '0 0 8px 0',
          }}>
            PARABÉNS!
          </h2>
          
          <p style={{
            color: '#a0a0a0',
            fontSize: '18px',
            margin: 0,
          }}>
            Você ganhou um desconto exclusivo!
          </p>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          {/* Badge do desconto */}
          <div style={{
            display: 'inline-block',
            padding: '16px 32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(64, 163, 122, 0.2) 100%)',
            border: '2px solid rgba(255, 184, 0, 0.4)',
            marginBottom: '24px',
          }}>
            <span style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '64px',
              color: '#ffb800',
            }}>
              {discount}%
            </span>
            <span style={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '18px',
              marginTop: '4px',
            }}>
              de desconto
            </span>
          </div>

          {/* Mensagem de confirmação */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#40a37a',
            marginBottom: '24px',
          }}>
            <CheckCircle size={20} />
            <span>Desconto aplicado automaticamente</span>
          </div>

          {/* Botão continuar */}
          <button
            onClick={onContinue}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '12px',
              border: '2px solid #40a37a',
              background: 'linear-gradient(180deg, #40a37a 0%, #2c7b61 50%, #1c4d5d 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 20px rgba(64, 163, 122, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>Continuar para o Checkout</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinModal;
