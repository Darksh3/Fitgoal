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
            value: `
default-src 'self' blob:;
script-src 'self' 'unsafe-eval' 'unsafe-inline'
https://js.stripe.com
https://checkout.stripe.com
https://pay.google.com
https://vercel.live
https://browser-sentry-cdn.com
https://*.wistia.com
https://*.wistia.net
https://fast.wistia.com
https://fast.wistia.net
https://embedwistia-a.akamaihd.net;

style-src 'self' 'unsafe-inline'
https://fonts.googleapis.com
https://*.wistia.com
https://*.wistia.net;

img-src 'self' data: blob:
https://*.vercel-storage.com
https://q.stripe.com
https://pay.google.com
https://*.googleapis.com
https://*.gstatic.com
https://*.wistia.com
https://*.wistia.net
https://fast.wistia.com
https://fast.wistia.net
https://embedwistia-a.akamaihd.net;

media-src 'self' blob:
https://*.wistia.com
https://*.wistia.net
https://fast.wistia.com
https://fast.wistia.net
https://embedwistia-a.akamaihd.net;

connect-src 'self'
https://api.stripe.com
https://firestore.googleapis.com
https://*.firebaseio.com
https://identitytoolkit.googleapis.com
https://securetoken.googleapis.com
https://*.vercel-storage.com
https://*.wistia.com
https://*.wistia.net
https://fast.wistia.com
https://fast.wistia.net
https://embedwistia-a.akamaihd.net;

frame-src
https://js.stripe.com
https://checkout.stripe.com
https://pay.google.com
https://*.wistia.com
https://*.wistia.net
https://fast.wistia.com
https://fast.wistia.net;

worker-src blob:;
`.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
