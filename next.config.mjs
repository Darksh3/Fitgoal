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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://vercel.live https://fast.wistia.com https://home.wistia.com; style-src 'self' 'unsafe-inline' https://fast.wistia.com https://home.wistia.com; img-src 'self' data: blob: https://*.vercel-storage.com https://q.stripe.com https://pay.google.com https://*.googleapis.com https://*.gstatic.com https://fast.wistia.com; connect-src 'self' https://api.stripe.com https://pay.google.com https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.vercel-storage.com https://fast.wistia.com https://home.wistia.com; frame-src https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://fast.wistia.com https://home.wistia.com;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
