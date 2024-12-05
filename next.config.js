/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    unoptimized: true
  },
  // Disable server API routes for static export
  rewrites: () => [],
  // Skip API route build
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    return config
  }
}
