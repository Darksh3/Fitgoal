/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
          ignoreBuildErrors: true,
    },
    images: {
          unoptimized: true,
    },
    staticPageGenerationTimeout: 60,
    experimental: {
          // Certifique-se de que páginas de erro especiais não sejam renderizadas estaticamente
      isrMemoryCacheSize: 0,
    },
    async headers() {
          // CSP base (compartilhada para todas as rotas)
      const baseCSP = {
              'default-src': ["'self'", "blob:"],
              'img-src': [
                        "'self'",
                        "data:",
                        "blob:",
                        "https://*.vercel-storage.com",
                        "https://*.googleapis.com",
                        "https://*.gstatic.com",
                        "https://*.wistia.com",
                        "https://*.wistia.net",
                        "https://fast.wistia.com",
                        "https://www.facebook.com",
                        "https://*.facebook.com",
                        "https://*.fbcdn.net",
                        "https://analytics.tiktok.com",
                        "https://*.tiktok.com",
                      ],
              'style-src': [
                        "'self'",
                        "'unsafe-inline'", // Necessário para Tailwind/Radix
                        "https://*.wistia.com",
                        "https://*.wistia.net",
                        "https://fonts.googleapis.com",
                      ],
              'font-src': ["'self'", "https://fonts.gstatic.com"],
              'media-src': [
                        "'self'",
                        "blob:",
                        "https://*.wistia.com",
                        "https://*.wistia.net",
                        "https://fast.wistia.com",
                        "https://home.wistia.com",
                      ],
              'connect-src': [
                        "'self'",
                        "https://firestore.googleapis.com",
                        "https://*.firebaseio.com",
                        "https://identitytoolkit.googleapis.com",
                        "https://securetoken.googleapis.com",
                        "https://*.vercel-storage.com",
                        "https://*.wistia.com",
                        "https://*.wistia.net",
                        "https://pipedream.wistia.com",
                        "https://distillery.wistia.com",
                        "https://fast.wistia.com",
                        "https://connect.facebook.net",
                        "https://www.facebook.com",
                        "https://*.facebook.com",
                        "https://analytics.tiktok.com",
                        "https://*.tiktok.com",
                      ],
              'frame-src': [
                        "https://fast.wistia.net",
                        "https://*.wistia.com",
                        "https://embedwistia-a.akamaihd.net",
                        "https://embed-ssl.wistia.com",
                        "https://*.wistia.net",
                        "https://fast.wistia.com",
                      ],
              'worker-src': ["blob:"],
      };

      // === CSP para CHECKOUT (mais restritiva — sem pixels de marketing) ===
      const checkoutScriptSrc = [
              "'self'",
              // Sem 'unsafe-eval' e sem 'unsafe-inline'
              // Sem Meta Pixel ou TikTok Pixel na página de checkout
              // Apenas scripts estritamente necessários para a transação
            ];

      const checkoutCSP = Object.entries({
              ...baseCSP,
              'script-src': checkoutScriptSrc,
      })
            .map(([key, values]) => `${key} ${values.join(' ')}`)
            .join('; ');

      // === CSP para páginas gerais (com pixels de marketing) ===
      const generalScriptSrc = [
              "'self'",
              "'unsafe-inline'", // Necessário para Meta Pixel e TikTok Pixel injetarem scripts inline
              "https://vercel.live",
              "https://*.wistia.com",
              "https://*.wistia.net",
              "https://pipedream.wistia.com",
              "https://distillery.wistia.com",
              "https://connect.facebook.net", // Meta Pixel
              "https://analytics.tiktok.com", // TikTok Pixel
              "https://*.tiktok.com", // TikTok Pixel subdomínios
              // REMOVIDO: 'unsafe-eval' — não é necessário para nenhum dos serviços
            ];

      const generalCSP = Object.entries({
              ...baseCSP,
              'script-src': generalScriptSrc,
      })
            .map(([key, values]) => `${key} ${values.join(' ')}`)
            .join('; ');

      return [
              // Checkout — CSP mais restritiva (sem pixels de marketing)
        {
                  source: '/checkout/:path*',
                  headers: [
                    { key: 'Content-Security-Policy', value: checkoutCSP },
                            ],
        },
        {
                  source: '/complementos-checkout/:path*',
                  headers: [
                    { key: 'Content-Security-Policy', value: checkoutCSP },
                            ],
        },
              // Todas as outras páginas (com pixels de marketing)
        {
                  source: '/:path*',
                  headers: [
                    { key: 'Content-Security-Policy', value: generalCSP },
                            ],
        },
            ];
    },
};

export default nextConfig;
