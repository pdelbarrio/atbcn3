/** @type {import('next').NextConfig} */
const withSerwist = require('@serwist/next').default({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Maintain your existing PWA settings
  reloadOnOnline: true,
  cacheOnFrontEndNav: true
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "res.cloudinary.com",
        protocol: "https",
      },
    ],
  },
};

module.exports = withSerwist(nextConfig);