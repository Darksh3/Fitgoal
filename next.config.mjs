/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://vercel.live https://*.wistia.com https://*.wistia.net https://pipedream.wistia.com https://browser-sentry-cdn.com; style-src 'self' 'unsafe-inline' https://*.wistia.com https://*.wistia.net; img-src 'self' data: blob: https://*.vercel-storage.com https://q.stripe.com https://pay.google.com https://*.googleapis.com https://*.gstatic.com https://*.wistia.com https://*.wistia.net; connect-src 'self' https://api.stripe.com https://pay.google.com https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.vercel-storage.com https://*.wistia.com https://*.wistia.net https://pipedream.wistia.com; frame-src https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://*.wistia.com https://*.wistia.net;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
