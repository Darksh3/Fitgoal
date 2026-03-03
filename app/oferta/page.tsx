'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Play } from 'lucide-react'

export default function OfertaPage() {
  const [vslDelay, setVslDelay] = useState(0)
  const [isLocked, setIsLocked] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)

  useEffect(() => {
    // VSL delay configuration - 10 minutes
    const delay = 10 * 60
    setVslDelay(delay)
    setTimeRemaining(delay)
    setShowCountdown(delay > 0)
    document.body.classList.add('page-locked')

    if (delay > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setIsLocked(false)
            document.body.classList.remove('page-locked')
            document.body.classList.add('unlocking')
            setTimeout(() => document.body.classList.remove('unlocking'), 1500)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    } else {
      setIsLocked(false)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCTAClick = () => {
    if (!isLocked) {
      window.location.href = '/checkout'
    }
  }

  return (
    <div style={{ background: '#07090d', color: '#eef2f7', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07090d; color: #eef2f7; }
        
        [data-lock] {
          transition: opacity 0.9s ease, filter 0.9s ease;
        }
        body.page-locked [data-lock] {
          opacity: 0 !important;
          pointer-events: none;
          user-select: none;
          filter: blur(2px);
        }
        body.page-locked .sticky { display: none !important; }
        
        body.unlocking [data-lock]:nth-child(1)  { transition-delay: 0s }
        body.unlocking [data-lock]:nth-child(2)  { transition-delay: 0.15s }
        body.unlocking [data-lock]:nth-child(3)  { transition-delay: 0.3s }
        body.unlocking [data-lock]:nth-child(4)  { transition-delay: 0.45s }
        body.unlocking [data-lock]:nth-child(5)  { transition-delay: 0.6s }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 232, 122, 0.55); }
          70% { box-shadow: 0 0 0 22px rgba(0, 232, 122, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 232, 122, 0); }
        }
        
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 4px 32px rgba(0, 232, 122, 0.35); }
          50% { box-shadow: 0 4px 60px rgba(0, 232, 122, 0.70); }
        }
        
        .btn { 
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #00e87a;
          color: #000;
          font-size: 15px;
          font-weight: 800;
          padding: 17px 36px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 32px rgba(0, 232, 122, 0.35);
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover { 
          background: #00c060;
          transform: translateY(-2px);
          box-shadow: 0 8px 44px rgba(0, 232, 122, 0.45);
        }
        .btn.pulse { animation: ctaPulse 1.8s ease infinite; }
        
        .vsl-wrap { max-width: 740px; margin: 0 auto; }
        .vsl-box {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          border: 2px solid rgba(0, 232, 122, 0.28);
          aspect-ratio: 16/9;
          cursor: pointer;
          background: #000;
          box-shadow: 0 0 48px rgba(0, 232, 122, 0.14), 0 30px 80px rgba(0, 0, 0, 0.65);
        }
        .vsl-play {
          width: 80px;
          height: 80px;
          background: #00e87a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2.2s infinite;
          transition: transform 0.2s;
        }
        .vsl-box:hover .vsl-play { transform: scale(1.08); }
        
        #vsl-countdown {
          max-width: 740px;
          margin: 14px auto 0;
          background: #111720;
          border: 1px solid rgba(0, 232, 122, 0.28);
          border-radius: 20px;
          padding: 14px 20px;
          display: none;
        }
        #vsl-countdown.show { display: block; }
        
        .cd-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #8fa0b8;
        }
        .cd-time {
          font-size: 14px;
          font-weight: 800;
          color: #00e87a;
        }
        .cd-bar-fill {
          height: 5px;
          width: 0%;
          background: linear-gradient(90deg, #00c060, #00e87a);
          border-radius: 999px;
          transition: width 0.5s linear;
        }
      `}</style>

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(7, 9, 13, 0.9)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        padding: '13px 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '0 20px',
          position: 'relative'
        }}>
          <div style={{ fontSize: '21px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Fit<span style={{ color: '#00e87a' }}>Goal</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '106px 20px 60px',
        textAlign: 'center',
        overflow: 'hidden',
        position: 'relative',
        marginTop: '60px'
      }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          {/* Stars */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '18px' }}>
            {[...Array(5)].map((_, i) => (
              <span key={i} style={{ color: '#f59e0b', fontSize: '18px' }}>★</span>
            ))}
            <span style={{ fontSize: '13px', color: '#8fa0b8', marginLeft: '6px' }}>18.948 transformados</span>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0, 232, 122, 0.16)',
            border: '1px solid rgba(0, 232, 122, 0.28)',
            color: '#00e87a',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '5px 14px',
            borderRadius: '999px',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={14} /> Sistema Corpo Responsivo™
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(28px, 5.5vw, 54px)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-1.5px',
            marginBottom: '22px'
          }}>
            Por que seu corpo <span style={{ color: '#00e87a' }}>travou</span> — e como reprogramá-lo para perder <span style={{ color: '#00e87a' }}>8–15kg em 90 dias</span>
          </h1>

          {/* Subheading */}
          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 19px)',
            color: '#8fa0b8',
            maxWidth: '640px',
            margin: '0 auto 34px',
            lineHeight: 1.75
          }}>
            Primeiro método de transformação física com <strong style={{ color: '#eef2f7' }}>análise visual por IA</strong> que se adapta ao seu corpo — mesmo após anos de dietas falhadas.
          </p>

          {/* VSL Container */}
          <div className="vsl-wrap" data-lock>
            <div className="vsl-box">
              <div style={{
                backgroundImage: 'url("https://fitgoal.com.br/images/fitness-couple-new.webp")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'absolute',
                inset: 0,
                filter: 'brightness(0.38) saturate(1.2)'
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,232,122,0.06) 0%, rgba(0,0,0,0.4) 100%)',
                pointerEvents: 'none'
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px'
              }}>
                <div className="vsl-play">
                  <Play size={28} fill="#000" style={{ marginLeft: '5px' }} />
                </div>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  letterSpacing: '0.04em',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                }}>
                  Assista à Apresentação (7:59)
                </p>
              </div>
              <div style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 232, 122, 0.28)',
                color: '#00e87a',
                fontSize: '11px',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '999px'
              }}>
                PRESSIONE PLAY
              </div>
            </div>
          </div>

          {/* Countdown */}
          {showCountdown && (
            <div id="vsl-countdown" className={`${isLocked ? '' : 'show'}`} style={{ display: isLocked ? 'block' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                <div className="cd-msg">
                  <span>⏱️</span>
                  <span>Conteúdo será liberado em:</span>
                </div>
                <span className="cd-time">{formatTime(timeRemaining)}</span>
              </div>
              <div style={{
                width: '100%',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.07)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div className="cd-bar-fill" style={{
                  width: `${((vslDelay - timeRemaining) / vslDelay) * 100}%`
                }} />
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '36px' }} data-lock>
            <button
              className={`btn ${!isLocked ? 'pulse' : ''}`}
              onClick={handleCTAClick}
              disabled={isLocked}
              style={{
                opacity: isLocked ? 0.6 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer'
              }}
            >
              QUERO COMEÇAR A TRANSFORMAÇÃO
            </button>
            <p style={{ fontSize: '12px', color: '#3d5066' }}>
              ✓ Sem taxa de inscrição • ✓ Acesso imediato • ✓ Garantia de 30 dias
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{
        background: '#0c1018',
        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        padding: '28px 20px'
      }} data-lock>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          maxWidth: '1080px',
          margin: '0 auto'
        }}>
          {[
            { number: '+18.948', label: 'Pessoas Transformadas' },
            { number: '8-15kg', label: 'Perda Média em 90 Dias' },
            { number: '98%', label: 'Taxa de Satisfação' },
            { number: '24/7', label: 'Suporte Premium' }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 900, color: '#00e87a', lineHeight: 1 }}>
                {stat.number}
              </div>
              <div style={{ fontSize: '12px', color: '#8fa0b8', fontWeight: 500, marginTop: '3px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problems Section */}
      <section style={{ padding: '80px 20px' }} data-lock>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: 'clamp(26px, 5vw, 40px)',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '14px'
            }}>
              Por que <span style={{ color: '#00e87a' }}>outras dietas falharam</span>
            </h2>
            <p style={{
              fontSize: 'clamp(15px, 2vw, 17px)',
              color: '#8fa0b8',
              maxWidth: '580px',
              margin: '0 auto'
            }}>
              A verdade que ninguém te conta sobre transformação corporal
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '14px'
          }}>
            {[
              { title: '❌ Sem Personalização', desc: 'Planos genéricos que não consideram seu corpo' },
              { title: '❌ Sem Inteligência', desc: 'Sem ajustes automáticos conforme você progride' },
              { title: '❌ Sem Sustentabilidade', desc: 'Métodos extremos que você não consegue manter' },
              { title: '❌ Sem Suporte Real', desc: 'Deixado sozinho com conteúdo pré-gravado' }
            ].map((prob, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                background: '#111720',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '20px',
                transition: 'border-color 0.2s'
              }}>
                <div style={{
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {prob.title.split(' ')[0]}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    marginBottom: '4px'
                  }}>
                    {prob.title.substring(3)}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#8fa0b8',
                    lineHeight: 1.65
                  }}>
                    {prob.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ padding: '60px 20px', textAlign: 'center' }} data-lock>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(26px, 5vw, 40px)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '28px'
          }}>
            Está pronto para <span style={{ color: '#00e87a' }}>transformar seu corpo</span>?
          </h2>
          <button
            className={`btn ${!isLocked ? 'pulse' : ''}`}
            onClick={handleCTAClick}
            disabled={isLocked}
            style={{
              opacity: isLocked ? 0.6 : 1,
              cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
          >
            COMEÇAR AGORA
          </button>
        </div>
      </section>
    </div>
  )
}
