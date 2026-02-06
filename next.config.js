/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      // API versioning: /api/v1/* maps to /api/* (current version)
      {
        source: "/api/v1/:path*",
        destination: "/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
