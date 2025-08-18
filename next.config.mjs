/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
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
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://pay.google.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://q.stripe.com https://pay.google.com https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://api.stripe.com https://pay.google.com https://firestore.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src https://js.stripe.com https://checkout.stripe.com https://pay.google.com;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
