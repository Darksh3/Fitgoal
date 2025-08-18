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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent firebase-admin and other server-only packages from being bundled on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      }
      
      config.externals = config.externals || []
      config.externals.push({
        'firebase-admin': 'commonjs firebase-admin',
        '@sendgrid/mail': 'commonjs @sendgrid/mail',
      })
    }
    return config
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

const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config

export default withBundleAnalyzer(nextConfig);
