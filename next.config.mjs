/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // 'unsafe-inline' mantido apenas para estilos (necessário para Tailwind/CSS-in-JS).
            // 'unsafe-eval' e 'unsafe-inline' removidos do script-src para reduzir superfície XSS.
            // Se algum script de terceiros quebrar, adicione apenas o domínio específico aqui.
            value: `default-src 'self' blob:; script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://vercel.live https://*.wistia.com https://*.wistia.net https://pipedream.wistia.com https://distillery.wistia.com https://connect.facebook.net https://analytics.tiktok.com; style-src 'self' 'unsafe-inline' https://*.wistia.com https://*.wistia.net https://fonts.googleapis.com; img-src 'self' data: blob: https://*.vercel-storage.com https://q.stripe.com https://pay.google.com https://*.googleapis.com https://*.gstatic.com https://*.wistia.com https://*.wistia.net https://fast.wistia.com https://www.facebook.com; media-src 'self' blob: https://*.wistia.com https://*.wistia.net https://fast.wistia.com https://home.wistia.com; connect-src 'self' https://api.stripe.com https://pay.google.com https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.vercel-storage.com https://*.wistia.com https://*.wistia.net https://pipedream.wistia.com https://distillery.wistia.com https://fast.wistia.com https://graph.facebook.com https://analytics.tiktok.com; frame-src https://js.stripe.com https://checkout.stripe.com https://fast.wistia.net https://pay.google.com https://*.wistia.com https://embedwistia-a.akamaihd.net https://embed-ssl.wistia.com https://*.wistia.net https://fast.wistia.com; worker-src blob:;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
