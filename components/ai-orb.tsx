export function AiOrb({ size = 192 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto animate-[orbBreath_10s_ease-in-out_infinite]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Outer glow (bem macio) */}
      <div
        className="absolute inset-[-22%] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(34,211,238,.35), transparent 55%)," +
            "radial-gradient(circle at 70% 55%, rgba(34,197,94,.25), transparent 60%)," +
            "radial-gradient(circle at 50% 70%, rgba(59,130,246,.25), transparent 60%)",
        }}
      />

      {/* Orb */}
      <svg width={size} height={size} viewBox="0 0 200 200" className="absolute inset-0">
        <defs>
          {/* Gradiente principal */}
          <radialGradient id="g1" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
            <stop offset="45%" stopColor="#22D3EE" stopOpacity="1" />
            <stop offset="75%" stopColor="#22C55E" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0B1220" stopOpacity="1" />
          </radialGradient>

          {/* Ruído pra efeito líquido */}
          <filter id="liquid" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="2" result="noise">
              <animate attributeName="baseFrequency" dur="6s" values="0.010;0.014;0.010" repeatCount="indefinite" />
            </feTurbulence>

            <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G">
              <animate attributeName="scale" dur="6s" values="14;20;14" repeatCount="indefinite" />
            </feDisplacementMap>
          </filter>

          {/* Brilho interno suave */}
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 .7 0"
              result="colored"
            />
            <feMerge>
              <feMergeNode in="colored" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip circular perfeito */}
          <clipPath id="clipCircle">
            <circle cx="100" cy="100" r="78" />
          </clipPath>
        </defs>

        {/* Base circle */}
        <circle cx="100" cy="100" r="78" fill="#0B1220" opacity="0.9" />

        {/* Camada líquida com gradiente */}
        <g clipPath="url(#clipCircle)" filter="url(#liquid)">
          <rect x="20" y="20" width="160" height="160" fill="url(#g1)">
            {/* movimento "rodando" */}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="6s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        {/* Highlight (luz) */}
        <circle cx="78" cy="72" r="42" fill="#93C5FD" opacity="0.18" filter="url(#innerGlow)" />

        {/* Vignette pra profundidade */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="22" opacity="0.55" />

        {/* Borda sutil */}
        <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>
    </div>
  )
}
